/**
 * AUTOMERGE MODULE - SQLite Cache Builder
 * LOCAL DATA ENGINEER: Rebuilds SQLite cache from Automerge documents
 *
 * ARCHITECTURE:
 * - Uses full rebuild strategy (delete + re-insert), NOT differential updates
 * - All operations within a single Drizzle transaction for atomicity
 * - Deterministic: same doc → same SQLite state
 * - Uses deterministic IDs for expense splits: `${expenseId}-${participantId}`
 *
 * DESIGN PRINCIPLES:
 * 1. Single Source of Truth: Automerge doc is authoritative
 * 2. SQLite is a derived cache that can be rebuilt at any time
 * 3. CASCADE deletes handle child records automatically
 * 4. All-or-nothing: Transaction rollback on any error
 */

import { eq } from "drizzle-orm";
import { db } from "@db/client";
import {
  trips,
  participants,
  expenses,
  expenseSplits,
  settlements,
} from "@db/schema";
import type { TripAutomergeDoc } from "../engine/doc-schema";
import { createAppError } from "@utils/errors";
import { automergeLogger } from "@utils/logger";

/**
 * Map shareType from Automerge schema to SQLite schema
 *
 * Automerge uses: "equal" | "percentage" | "exact_amount" | "shares"
 * SQLite uses: "equal" | "percentage" | "amount" | "weight"
 *
 * Mapping:
 * - "exact_amount" → "amount"
 * - "shares" → "weight"
 * - "equal" → "equal"
 * - "percentage" → "percentage"
 */
function mapShareTypeToSqlite(
  shareType: "equal" | "percentage" | "exact_amount" | "shares",
): "equal" | "percentage" | "weight" | "amount" {
  switch (shareType) {
    case "exact_amount":
      return "amount";
    case "shares":
      return "weight";
    case "equal":
      return "equal";
    case "percentage":
      return "percentage";
  }
}

/**
 * Rebuild the entire SQLite cache for a trip from its Automerge document
 *
 * STRATEGY: Full rebuild (delete + re-insert)
 * - Delete trip (CASCADE handles participants, expenses, splits, settlements)
 * - Insert trip metadata
 * - Insert participants
 * - Insert expenses with splits
 * - Insert settlements
 *
 * @param tripId - Trip ID to rebuild cache for
 * @param doc - Authoritative Automerge document
 * @throws {AppError} CACHE_REBUILD_FAILED - If any step fails
 */
export async function rebuildTripCache(
  tripId: string,
  doc: TripAutomergeDoc,
): Promise<void> {
  automergeLogger.info("Starting cache rebuild", { tripId });

  try {
    await db.transaction(async (tx) => {
      // Step 1: Delete existing trip (CASCADE handles all child records)
      automergeLogger.debug("Deleting existing trip data", { tripId });
      await tx.delete(trips).where(eq(trips.id, tripId));

      // Step 2: Insert trip metadata
      automergeLogger.debug("Inserting trip metadata", { tripId });
      await tx.insert(trips).values({
        id: doc.id,
        name: doc.name,
        description: null, // Not in Automerge schema yet
        startDate: doc.startDate,
        endDate: doc.endDate,
        currency: doc.currency,
        currencyCode: doc.currency, // Both fields get same value
        emoji: doc.emoji,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        isSampleData: false,
        sampleDataTemplateId: null,
        isArchived: false,
      });

      // Step 3: Insert participants
      const participantEntries = Object.values(doc.participants);
      if (participantEntries.length > 0) {
        automergeLogger.debug("Inserting participants", {
          tripId,
          count: participantEntries.length,
        });

        await tx.insert(participants).values(
          participantEntries.map((p) => ({
            id: p.id,
            tripId: doc.id,
            name: p.name,
            avatarColor: p.color, // Automerge uses 'color', SQLite uses 'avatarColor'
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })),
        );
      }

      // Step 4: Insert expenses with splits
      const expenseEntries = Object.values(doc.expenses);
      if (expenseEntries.length > 0) {
        automergeLogger.debug("Inserting expenses", {
          tripId,
          count: expenseEntries.length,
        });

        // Insert expenses
        await tx.insert(expenses).values(
          expenseEntries.map((e) => ({
            id: e.id,
            tripId: doc.id,
            description: e.description,
            notes: null, // Not in Automerge schema yet
            amount: e.convertedAmountMinor, // Legacy field = converted amount
            currency: doc.currency, // Legacy field uses trip currency
            originalCurrency: e.originalCurrency,
            originalAmountMinor: e.originalAmountMinor,
            fxRateToTrip: e.fxRateToTrip,
            convertedAmountMinor: e.convertedAmountMinor,
            paidBy: e.paidById, // Automerge uses 'paidById', SQLite uses 'paidBy'
            categoryId: e.categoryId,
            category: null, // DEPRECATED: null for new data
            date: e.date,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          })),
        );

        // Insert expense splits
        const allSplits = expenseEntries.flatMap((expense) =>
          Object.entries(expense.splits).map(([participantId, split]) => ({
            // CRITICAL: Deterministic ID pattern
            id: `${expense.id}-${participantId}`,
            expenseId: expense.id,
            participantId: participantId,
            share: split.shareValue,
            // Map shareType from Automerge schema to SQLite schema
            shareType: mapShareTypeToSqlite(split.shareType),
            amount: null, // Computed at query time, not stored
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt,
          })),
        );

        if (allSplits.length > 0) {
          automergeLogger.debug("Inserting expense splits", {
            tripId,
            count: allSplits.length,
          });

          await tx.insert(expenseSplits).values(allSplits);
        }
      }

      // Step 5: Insert settlements
      const settlementEntries = Object.values(doc.settlements);
      if (settlementEntries.length > 0) {
        automergeLogger.debug("Inserting settlements", {
          tripId,
          count: settlementEntries.length,
        });

        await tx.insert(settlements).values(
          settlementEntries.map((s) => ({
            id: s.id,
            tripId: doc.id,
            fromParticipantId: s.fromParticipantId,
            toParticipantId: s.toParticipantId,
            originalCurrency: s.originalCurrency,
            originalAmountMinor: s.originalAmountMinor,
            fxRateToTrip: s.fxRateToTrip,
            convertedAmountMinor: s.convertedAmountMinor,
            date: s.date,
            description: s.description,
            paymentMethod: s.paymentMethod,
            expenseSplitId: s.expenseSplitId,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          })),
        );
      }

      automergeLogger.info("Cache rebuild completed", {
        tripId,
        participants: participantEntries.length,
        expenses: expenseEntries.length,
        settlements: settlementEntries.length,
      });
    });
  } catch (error) {
    automergeLogger.error("Cache rebuild failed", error);
    throw createAppError(
      "CACHE_REBUILD_FAILED",
      "Failed to rebuild SQLite cache",
      {
        cause: error,
        details: {
          tripId,
          docId: doc.id,
        },
      },
    );
  }
}

/**
 * Detect trips that need cache rebuilding (desync detection)
 *
 * STRATEGY: Compare trip count and updatedAt timestamps
 * - Fast: No deep object comparison
 * - Catches common desyncs: missing trips, stale data
 *
 * Runs on app startup to detect and auto-rebuild stale caches.
 *
 * @returns Array of trip IDs that need cache rebuilding
 */
export async function detectStaleTrips(): Promise<string[]> {
  const staleTrips: string[] = [];

  try {
    automergeLogger.debug("Detecting stale trips");

    // Load all trips from SQLite
    const sqliteTrips = await db.query.trips.findMany();

    // Import AutomergeManager once, outside the loop
    const { AutomergeManager } = await import("../service/AutomergeManager");
    const manager = new AutomergeManager();

    for (const sqliteTrip of sqliteTrips) {
      try {
        const doc = await manager.loadTrip(sqliteTrip.id);

        if (!doc) {
          // Automerge doc missing - critical desync
          automergeLogger.warn("Automerge doc missing for trip", {
            tripId: sqliteTrip.id,
          });
          staleTrips.push(sqliteTrip.id);
          continue;
        }

        // Check updatedAt timestamp
        if (doc.updatedAt !== sqliteTrip.updatedAt) {
          automergeLogger.debug("Trip updatedAt mismatch (stale cache)", {
            tripId: sqliteTrip.id,
            sqliteUpdatedAt: sqliteTrip.updatedAt,
            docUpdatedAt: doc.updatedAt,
          });
          staleTrips.push(sqliteTrip.id);
        }
      } catch (error) {
        automergeLogger.error("Failed to load Automerge doc for trip", {
          tripId: sqliteTrip.id,
          error,
        });
        staleTrips.push(sqliteTrip.id);
      }
    }

    if (staleTrips.length > 0) {
      automergeLogger.warn("Detected stale trips", {
        count: staleTrips.length,
        tripIds: staleTrips,
      });
    } else {
      automergeLogger.info("No stale trips detected");
    }

    return staleTrips;
  } catch (error) {
    automergeLogger.error("Failed to detect stale trips", error);
    return []; // Return empty array on error (don't block app startup)
  }
}

/**
 * Verify SQLite cache consistency against Automerge document
 *
 * CHECKS:
 * - Trip metadata fields match
 * - Participant count and IDs match
 * - Expense count matches
 * - Settlement count matches
 *
 * @param tripId - Trip ID to verify
 * @param doc - Authoritative Automerge document
 * @returns {consistent: true} if cache matches doc, or {consistent: false, errors: [...]} with details
 */
export async function verifyCacheConsistency(
  tripId: string,
  doc: TripAutomergeDoc,
): Promise<{ consistent: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Check trip metadata
    const tripRow = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });

    if (!tripRow) {
      errors.push(`Trip not found in SQLite: ${tripId}`);
      return { consistent: false, errors };
    }

    // Verify trip fields
    if (tripRow.name !== doc.name) {
      errors.push(
        `Trip name mismatch: SQLite="${tripRow.name}" vs Doc="${doc.name}"`,
      );
    }
    if (tripRow.currency !== doc.currency) {
      errors.push(
        `Trip currency mismatch: SQLite="${tripRow.currency}" vs Doc="${doc.currency}"`,
      );
    }
    if (tripRow.emoji !== doc.emoji) {
      errors.push(
        `Trip emoji mismatch: SQLite="${tripRow.emoji}" vs Doc="${doc.emoji}"`,
      );
    }
    if (tripRow.startDate !== doc.startDate) {
      errors.push(
        `Trip startDate mismatch: SQLite="${tripRow.startDate}" vs Doc="${doc.startDate}"`,
      );
    }
    if (tripRow.endDate !== doc.endDate) {
      errors.push(
        `Trip endDate mismatch: SQLite="${tripRow.endDate}" vs Doc="${doc.endDate}"`,
      );
    }

    // Check participants count and IDs
    const participantRows = await db.query.participants.findMany({
      where: eq(participants.tripId, tripId),
    });

    const docParticipantIds = new Set(Object.keys(doc.participants));
    const sqliteParticipantIds = new Set(participantRows.map((p) => p.id));

    if (participantRows.length !== docParticipantIds.size) {
      errors.push(
        `Participant count mismatch: SQLite=${participantRows.length} vs Doc=${docParticipantIds.size}`,
      );
    }

    // Check for missing participants in either direction
    for (const id of docParticipantIds) {
      if (!sqliteParticipantIds.has(id)) {
        errors.push(`Participant missing in SQLite: ${id}`);
      }
    }
    for (const id of sqliteParticipantIds) {
      if (!docParticipantIds.has(id)) {
        errors.push(`Extra participant in SQLite: ${id}`);
      }
    }

    // Check expenses count
    const expenseRows = await db.query.expenses.findMany({
      where: eq(expenses.tripId, tripId),
    });

    const docExpenseCount = Object.keys(doc.expenses).length;
    if (expenseRows.length !== docExpenseCount) {
      errors.push(
        `Expense count mismatch: SQLite=${expenseRows.length} vs Doc=${docExpenseCount}`,
      );
    }

    // Check settlements count
    const settlementRows = await db.query.settlements.findMany({
      where: eq(settlements.tripId, tripId),
    });

    const docSettlementCount = Object.keys(doc.settlements).length;
    if (settlementRows.length !== docSettlementCount) {
      errors.push(
        `Settlement count mismatch: SQLite=${settlementRows.length} vs Doc=${docSettlementCount}`,
      );
    }

    const consistent = errors.length === 0;
    if (consistent) {
      automergeLogger.debug("Cache verification passed", { tripId });
    } else {
      automergeLogger.warn("Cache verification failed", { tripId, errors });
    }

    return { consistent, errors };
  } catch (error) {
    automergeLogger.error("Cache verification error", error);
    errors.push(
      `Verification error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { consistent: false, errors };
  }
}
