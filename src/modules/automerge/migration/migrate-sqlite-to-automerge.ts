/**
 * AUTOMERGE MODULE - SQLite to Automerge Migration Script
 * LOCAL DATA ENGINEER: One-time bootstrap migration from SQLite to Automerge documents
 *
 * This script performs a one-time migration of all existing trips from SQLite
 * to Automerge documents. It is idempotent (safe to re-run) and uses a flag
 * file to track completion.
 *
 * ARCHITECTURE:
 * - Location: src/modules/automerge/migration/migrate-sqlite-to-automerge.ts
 * - Run during app startup (before app renders)
 * - One-time execution using completion flag file
 * - Idempotent (safe to re-run)
 *
 * MIGRATION LOGIC:
 * 1. Check if migration already complete (via flag file)
 * 2. If complete, return 0 (skip migration)
 * 3. Load all trips from SQLite
 * 4. For each trip:
 *    a. Check if Automerge doc already exists (skip if yes)
 *    b. Load trip data from SQLite (trip, participants, expenses, settlements)
 *    c. Create Automerge doc using AutomergeManager
 *    d. Add all participants to doc
 *    e. Add all expenses with splits to doc
 *    f. Add all settlements to doc
 *    g. Verify doc was created successfully
 * 5. Mark migration complete
 * 6. Return count of migrated trips
 *
 * FIELD MAPPING (SQLite → Automerge):
 * - Participant: avatarColor → color
 * - Expense: paidBy → paidById
 * - ExpenseSplit: Array of rows → Object { [participantId]: { shareType, shareValue } }
 *   - shareType mapping: amount → exact_amount, weight → shares
 */

import * as FileSystem from "expo-file-system/legacy";
import { db } from "@db/client";
import { trips as tripsTable } from "@db/schema/trips";
import { eq } from "drizzle-orm";
import { getParticipantsForTrip } from "@modules/participants/repository";
import {
  getExpensesForTrip,
  getExpenseSplits,
} from "@modules/expenses/repository";
import { getSettlementsForTrip } from "@modules/settlements/repository";
import { AutomergeManager } from "../service/AutomergeManager";
import { automergeLogger } from "@utils/logger";
import { createAppError } from "@utils/errors";
import type { ExpenseSplit } from "@modules/expenses/types";

/**
 * Flag file location to track migration completion
 */
const MIGRATION_FLAG_FILE = `${FileSystem.documentDirectory}automerge-migration-complete`;

/**
 * Check if migration has already been completed
 * @returns true if migration complete, false otherwise
 */
export async function isMigrationComplete(): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(MIGRATION_FLAG_FILE);
    return fileInfo.exists;
  } catch (error) {
    automergeLogger.warn("Error checking migration flag file", { error });
    return false;
  }
}

/**
 * Mark migration as complete by writing flag file with timestamp
 */
export async function markMigrationComplete(): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    await FileSystem.writeAsStringAsync(
      MIGRATION_FLAG_FILE,
      JSON.stringify({
        completedAt: timestamp,
        version: "1.0.0",
      }),
    );
    automergeLogger.info("Migration marked as complete", { timestamp });
  } catch (error) {
    automergeLogger.error("Failed to write migration flag file", error);
    throw error;
  }
}

/**
 * Map SQLite shareType to Automerge shareType
 * - equal → equal
 * - percentage → percentage
 * - amount → exact_amount
 * - weight → shares
 */
function mapShareType(
  sqliteShareType: "equal" | "percentage" | "amount" | "weight",
): "equal" | "percentage" | "exact_amount" | "shares" {
  switch (sqliteShareType) {
    case "amount":
      return "exact_amount";
    case "weight":
      return "shares";
    default:
      return sqliteShareType;
  }
}

/**
 * Transform expense splits from SQLite array to Automerge object structure
 *
 * SQLite: Array of { participantId, share, shareType, amount? }
 * Automerge: Object { [participantId]: { shareType, shareValue } }
 *
 * @param splits - Array of expense splits from SQLite
 * @returns Object mapping participantId to split data
 */
function transformExpenseSplits(splits: ExpenseSplit[]): {
  [participantId: string]: {
    shareType: "equal" | "percentage" | "exact_amount" | "shares";
    shareValue: number;
  };
} {
  const result: {
    [participantId: string]: {
      shareType: "equal" | "percentage" | "exact_amount" | "shares";
      shareValue: number;
    };
  } = {};

  for (const split of splits) {
    const shareType = mapShareType(split.shareType);
    let shareValue: number;

    // Determine shareValue based on shareType
    if (shareType === "exact_amount") {
      // For exact_amount, use the amount field (in cents)
      shareValue = split.amount ?? 0;
    } else {
      // For equal, percentage, shares: use the share field
      shareValue = split.share;
    }

    result[split.participantId] = {
      shareType,
      shareValue,
    };
  }

  return result;
}

/**
 * Migrate a single trip from SQLite to Automerge
 *
 * @param tripId - Trip UUID
 * @param manager - AutomergeManager instance
 * @returns true if migrated, false if skipped (doc already exists)
 * @throws Error if migration fails
 */
export async function migrateTrip(
  tripId: string,
  manager: AutomergeManager,
): Promise<boolean> {
  automergeLogger.debug("Checking trip for migration", { tripId });

  // Check if Automerge doc already exists (skip if yes)
  const exists = await manager.tripExists(tripId);
  if (exists) {
    automergeLogger.debug("Automerge doc already exists, skipping", { tripId });
    return false;
  }

  automergeLogger.info("Starting migration for trip", { tripId });

  try {
    // Load trip data from SQLite
    const tripRows = await db
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.id, tripId))
      .limit(1);

    if (!tripRows.length) {
      automergeLogger.error("Trip not found in SQLite", { tripId });
      throw createAppError(
        "TRIP_NOT_FOUND",
        `Trip ${tripId} not found in SQLite`,
        { details: { tripId } },
      );
    }

    const trip = tripRows[0];

    // Load all related data in parallel
    const [participants, expenses, settlements] = await Promise.all([
      getParticipantsForTrip(tripId),
      getExpensesForTrip(tripId),
      getSettlementsForTrip(tripId),
    ]);

    automergeLogger.debug("Loaded trip data from SQLite", {
      tripId,
      participantCount: participants.length,
      expenseCount: expenses.length,
      settlementCount: settlements.length,
    });

    // Create Automerge doc
    await manager.createTrip({
      id: trip.id,
      name: trip.name,
      emoji: trip.emoji ?? "✈️",
      currency: trip.currencyCode,
      startDate: trip.startDate,
      endDate: trip.endDate ?? null,
    });

    automergeLogger.debug("Created Automerge doc", { tripId });

    // Add all participants
    for (const participant of participants) {
      await manager.addParticipant(tripId, {
        id: participant.id,
        name: participant.name,
        color: participant.avatarColor ?? "#3B82F6", // Default blue if no color
      });
    }

    automergeLogger.debug("Added participants to doc", {
      tripId,
      count: participants.length,
    });

    // Add all expenses with splits
    for (const expense of expenses) {
      // Load splits for this expense
      const splits = await getExpenseSplits(expense.id);

      // Transform splits from array to object structure
      const splitObject = transformExpenseSplits(splits);

      await manager.addExpense(tripId, {
        id: expense.id,
        description: expense.description,
        originalAmountMinor: expense.originalAmountMinor,
        originalCurrency: expense.originalCurrency,
        convertedAmountMinor: expense.convertedAmountMinor,
        fxRateToTrip: expense.fxRateToTrip ?? null,
        categoryId: expense.categoryId ?? null,
        paidById: expense.paidBy, // Field mapping: paidBy → paidById
        date: expense.date,
        splits: splitObject,
      });
    }

    automergeLogger.debug("Added expenses to doc", {
      tripId,
      count: expenses.length,
    });

    // Add all settlements
    for (const settlement of settlements) {
      await manager.addSettlement(tripId, {
        id: settlement.id,
        fromParticipantId: settlement.fromParticipantId,
        toParticipantId: settlement.toParticipantId,
        originalAmountMinor: settlement.originalAmountMinor,
        originalCurrency: settlement.originalCurrency,
        convertedAmountMinor: settlement.convertedAmountMinor,
        fxRateToTrip: settlement.fxRateToTrip,
        date: settlement.date,
        description: settlement.description,
        paymentMethod: settlement.paymentMethod,
        expenseSplitId: settlement.expenseSplitId,
      });
    }

    automergeLogger.debug("Added settlements to doc", {
      tripId,
      count: settlements.length,
    });

    // Verify doc was created successfully
    const verifiedDoc = await manager.loadTrip(tripId);
    if (!verifiedDoc) {
      throw createAppError(
        "MIGRATION_VERIFICATION_FAILED",
        `Migration verification failed: doc for trip ${tripId} not found after creation`,
        { details: { tripId } },
      );
    }

    automergeLogger.info("Successfully migrated trip", {
      tripId,
      participantCount: participants.length,
      expenseCount: expenses.length,
      settlementCount: settlements.length,
    });
    return true;
  } catch (error) {
    automergeLogger.error("Failed to migrate trip", {
      tripId,
      error,
    });
    throw error;
  }
}

/**
 * Main migration function: migrate all trips from SQLite to Automerge
 *
 * This function:
 * 1. Checks if migration already complete (via flag file)
 * 2. If complete, returns 0 (skip migration)
 * 3. Loads all trips from SQLite
 * 4. Migrates each trip (skips if doc already exists)
 * 5. Marks migration complete if all trips migrated successfully
 * 6. Returns count of migrated trips
 *
 * @returns Number of trips migrated (0 if already complete or no trips to migrate)
 * @throws Error if any trip migration fails (does NOT mark migration complete)
 */
export async function migrateAllTrips(): Promise<number> {
  automergeLogger.info("Starting SQLite to Automerge migration");

  // Check if migration already complete
  const isComplete = await isMigrationComplete();
  if (isComplete) {
    automergeLogger.info("Migration already complete, skipping");
    return 0;
  }

  // Load all trips from SQLite
  const trips = await db.select().from(tripsTable);
  automergeLogger.info("Loaded trips from SQLite", { count: trips.length });

  if (trips.length === 0) {
    automergeLogger.info("No trips to migrate, marking migration complete");
    await markMigrationComplete();
    return 0;
  }

  // Migrate each trip
  const manager = new AutomergeManager();
  let migratedCount = 0;
  const failedTrips: { tripId: string; error: unknown }[] = [];

  for (const trip of trips) {
    try {
      const migrated = await migrateTrip(trip.id, manager);
      if (migrated) {
        migratedCount++;
      }
    } catch (error) {
      automergeLogger.error("Trip migration failed", {
        tripId: trip.id,
        error,
      });
      failedTrips.push({ tripId: trip.id, error });
    }
  }

  // If any trips failed, throw error and DO NOT mark migration complete
  if (failedTrips.length > 0) {
    const failedTripIds = failedTrips.map((f) => f.tripId);
    automergeLogger.error("Migration failed for some trips", {
      failedCount: failedTrips.length,
      failedTripIds,
    });
    throw createAppError(
      "MIGRATION_FAILED",
      `Migration failed for ${failedTrips.length} trip(s): ${failedTripIds.join(", ")}`,
      {
        details: {
          failedCount: failedTrips.length,
          failedTripIds,
        },
      },
    );
  }

  // Mark migration complete
  await markMigrationComplete();

  automergeLogger.info("Migration completed successfully", {
    totalTrips: trips.length,
    migratedCount,
    skippedCount: trips.length - migratedCount,
  });

  return migratedCount;
}
