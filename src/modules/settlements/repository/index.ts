/**
 * SETTLEMENTS REPOSITORY
 * LOCAL DATA ENGINEER: Multi-currency aware settlement CRUD with ACID-safe writes
 * DUAL-WRITE: Writes to Automerge first, then rebuilds SQLite cache
 *
 * Manages payment transactions between participants to settle debts.
 * Follows the same multi-currency pattern as ExpenseRepository.
 */

import * as Crypto from "expo-crypto";
import { db } from "@db/client";
import {
  settlements as settlementsTable,
  Settlement as SettlementRow,
} from "@db/schema/settlements";
import { participants as participantsTable } from "@db/schema/participants";
import { trips as tripsTable } from "@db/schema/trips";
import { expenseSplits as expenseSplitsTable } from "@db/schema/expense-splits";
import { eq, and, inArray } from "drizzle-orm";
import {
  Settlement,
  NewSettlementData,
  UpdateSettlementData,
  SettlementWithParticipants,
  SettlementPaymentMethod,
} from "../types";
import { settlementLogger } from "@utils/logger";
import type { CachedFxRateProvider } from "@modules/fx-rates/provider/cached-fx-rate-provider";
import { CurrencyUtils } from "@utils/currency";
import {
  createFxRateError,
  createNotFoundError,
  createAppError,
} from "@utils/errors";
import { AutomergeManager } from "@modules/automerge/service/AutomergeManager";
import { rebuildTripCache } from "@modules/automerge/repository/sqlite-cache-builder";

/**
 * Singleton AutomergeManager instance for dual-write operations
 */
const automergeManager = new AutomergeManager();

/**
 * Map database row to domain Settlement type
 */
const mapSettlement = (row: SettlementRow): Settlement => ({
  id: row.id,
  tripId: row.tripId,
  fromParticipantId: row.fromParticipantId,
  toParticipantId: row.toParticipantId,
  expenseSplitId: row.expenseSplitId ?? null,
  originalCurrency: row.originalCurrency,
  originalAmountMinor: row.originalAmountMinor,
  fxRateToTrip: row.fxRateToTrip ?? null,
  convertedAmountMinor: row.convertedAmountMinor,
  date: row.date,
  description: row.description ?? null,
  paymentMethod: (row.paymentMethod as SettlementPaymentMethod) ?? null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * Get trip currency for a given trip ID
 * @throws Error if trip not found
 */
const getTripCurrency = async (tripId: string): Promise<string> => {
  const rows = await db
    .select({ currencyCode: tripsTable.currencyCode })
    .from(tripsTable)
    .where(eq(tripsTable.id, tripId))
    .limit(1);

  if (!rows.length) {
    settlementLogger.error("Trip not found for currency lookup", { tripId });
    throw createNotFoundError("TRIP_NOT_FOUND", "Trip", tripId);
  }

  return rows[0].currencyCode;
};

/**
 * Compute currency conversion for settlement amount
 * Same logic as ExpenseRepository's computeConversion
 *
 * @param fxRateProvider - FX rate provider instance (for dependency injection)
 * @returns convertedAmountMinor (in trip currency) and fxRateToTrip
 */
const computeConversion = (
  originalAmountMinor: number,
  originalCurrency: string,
  tripCurrencyCode: string,
  fxRateProvider: CachedFxRateProvider,
): { convertedAmountMinor: number; fxRateToTrip: number | null } => {
  if (originalCurrency === tripCurrencyCode) {
    settlementLogger.debug("No currency conversion needed", {
      originalCurrency,
      tripCurrency: tripCurrencyCode,
    });
    return { convertedAmountMinor: originalAmountMinor, fxRateToTrip: null };
  }

  // Fetch rate from cached FX provider
  try {
    const fxRate = fxRateProvider.getRate(originalCurrency, tripCurrencyCode);
    const converted = CurrencyUtils.convertWithFxRate(
      originalAmountMinor,
      fxRate,
    );

    settlementLogger.debug("Currency converted", {
      originalCurrency,
      tripCurrency: tripCurrencyCode,
      fxRate,
      originalAmountMinor,
      convertedAmountMinor: converted,
    });

    return { convertedAmountMinor: converted, fxRateToTrip: fxRate };
  } catch (error) {
    settlementLogger.error("Failed to get FX rate for settlement", {
      originalCurrency,
      tripCurrency: tripCurrencyCode,
      error,
    });

    // Re-throw with more context
    throw createFxRateError(
      "FX_RATE_NOT_FOUND",
      originalCurrency,
      tripCurrencyCode,
      { message: "Exchange rate not available. Please update FX rates." },
    );
  }
};

/**
 * Validate settlement data before write
 * @throws Error with code if validation fails
 */
const validateSettlement = async (
  tripId: string,
  fromParticipantId: string,
  toParticipantId: string,
  amountMinor: number,
  expenseSplitId?: string,
): Promise<void> => {
  // Ensure from and to participants are different
  if (fromParticipantId === toParticipantId) {
    settlementLogger.error("Cannot settle with same participant", {
      fromParticipantId,
      toParticipantId,
    });
    throw createAppError(
      "INVALID_SETTLEMENT_PARTICIPANTS",
      "From and to participants must be different",
    );
  }

  // Ensure amount is positive
  if (amountMinor <= 0) {
    settlementLogger.error("Invalid settlement amount", { amountMinor });
    throw createAppError(
      "INVALID_SETTLEMENT_AMOUNT",
      "Settlement amount must be positive",
      { details: { amountMinor } },
    );
  }

  // Verify participants belong to the trip
  const [fromExists, toExists] = await Promise.all([
    db
      .select({ id: participantsTable.id })
      .from(participantsTable)
      .where(
        and(
          eq(participantsTable.id, fromParticipantId),
          eq(participantsTable.tripId, tripId),
        ),
      )
      .limit(1),
    db
      .select({ id: participantsTable.id })
      .from(participantsTable)
      .where(
        and(
          eq(participantsTable.id, toParticipantId),
          eq(participantsTable.tripId, tripId),
        ),
      )
      .limit(1),
  ]);

  if (!fromExists.length) {
    settlementLogger.error("From participant not found in trip", {
      fromParticipantId,
      tripId,
    });
    throw createAppError(
      "INVALID_FROM_PARTICIPANT",
      `From participant ${fromParticipantId} not found in trip ${tripId}`,
    );
  }

  if (!toExists.length) {
    settlementLogger.error("To participant not found in trip", {
      toParticipantId,
      tripId,
    });
    throw createAppError(
      "INVALID_TO_PARTICIPANT",
      `To participant ${toParticipantId} not found in trip ${tripId}`,
    );
  }

  // If expenseSplitId provided, verify it exists
  if (expenseSplitId) {
    const splitExists = await db
      .select({ id: expenseSplitsTable.id })
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.id, expenseSplitId))
      .limit(1);

    if (!splitExists.length) {
      settlementLogger.error("Expense split not found", { expenseSplitId });
      throw createNotFoundError(
        "INVALID_EXPENSE_SPLIT",
        "Expense split",
        expenseSplitId,
      );
    }
  }
};

/**
 * Create a new settlement
 * Validates participants, computes currency conversion, and persists to database
 *
 * @param data - New settlement data
 * @param fxRateProvider - FX rate provider instance (required for dependency injection)
 * @returns Created settlement with enriched participant names
 */
export const createSettlement = async (
  data: NewSettlementData,
  fxRateProvider: CachedFxRateProvider,
): Promise<SettlementWithParticipants> => {
  const tripCurrencyCode = await getTripCurrency(data.tripId);
  const settlementId = Crypto.randomUUID();

  settlementLogger.debug("Creating settlement (dual-write)", {
    settlementId,
    tripId: data.tripId,
    fromParticipantId: data.fromParticipantId,
    toParticipantId: data.toParticipantId,
  });

  try {
    // Validate settlement data
    await validateSettlement(
      data.tripId,
      data.fromParticipantId,
      data.toParticipantId,
      data.originalAmountMinor,
      data.expenseSplitId,
    );

    // Compute currency conversion
    const { convertedAmountMinor, fxRateToTrip } = computeConversion(
      data.originalAmountMinor,
      data.originalCurrency,
      tripCurrencyCode,
      fxRateProvider,
    );

    // Step 1: Add settlement to Automerge document (source of truth)
    settlementLogger.debug("Adding settlement to Automerge", {
      settlementId,
      tripId: data.tripId,
    });
    const doc = await automergeManager.addSettlement(data.tripId, {
      id: settlementId,
      fromParticipantId: data.fromParticipantId,
      toParticipantId: data.toParticipantId,
      originalAmountMinor: data.originalAmountMinor,
      originalCurrency: data.originalCurrency,
      convertedAmountMinor,
      fxRateToTrip,
      date: data.date,
      description: data.description ?? null,
      paymentMethod: data.paymentMethod ?? null,
      expenseSplitId: data.expenseSplitId ?? null,
    });

    // Step 2: Rebuild SQLite cache from Automerge doc
    settlementLogger.debug("Rebuilding SQLite cache", { tripId: data.tripId });
    await rebuildTripCache(data.tripId, doc);

    // Step 3: Load and return from SQLite (cache layer) with participant names
    const settlement = await getSettlementById(settlementId);
    if (!settlement) {
      throw createAppError(
        "CACHE_DESYNC",
        `Settlement ${settlementId} created in Automerge but missing from SQLite`,
        { details: { settlementId, tripId: data.tripId } },
      );
    }

    settlementLogger.info("Settlement created (dual-write)", {
      settlementId,
      tripId: data.tripId,
      amountMinor: convertedAmountMinor,
    });

    return settlement;
  } catch (error) {
    settlementLogger.error("Failed to create settlement", {
      settlementId,
      tripId: data.tripId,
      error,
    });
    throw error;
  }
};

/**
 * Get a single settlement by ID with enriched participant names
 *
 * @param id - Settlement ID
 * @returns Settlement with participant names, or null if not found
 */
export const getSettlementById = async (
  id: string,
): Promise<SettlementWithParticipants | null> => {
  const rows = await db
    .select()
    .from(settlementsTable)
    .where(eq(settlementsTable.id, id))
    .limit(1);

  if (!rows.length) {
    settlementLogger.warn("Settlement not found", { settlementId: id });
    return null;
  }

  const settlement = rows[0];

  // Fetch participant names separately to avoid join alias collisions
  const [fromParticipant, toParticipant] = await Promise.all([
    db
      .select({ name: participantsTable.name })
      .from(participantsTable)
      .where(eq(participantsTable.id, settlement.fromParticipantId))
      .limit(1),
    db
      .select({ name: participantsTable.name })
      .from(participantsTable)
      .where(eq(participantsTable.id, settlement.toParticipantId))
      .limit(1),
  ]);

  settlementLogger.debug("Loaded settlement", {
    settlementId: id,
    tripId: settlement.tripId,
  });

  // Defensive check for participant data
  if (!fromParticipant.length || !toParticipant.length) {
    settlementLogger.warn("Settlement references deleted participant", {
      settlementId: id,
      fromParticipantId: settlement.fromParticipantId,
      toParticipantId: settlement.toParticipantId,
    });
    return {
      ...mapSettlement(settlement),
      fromParticipantName: fromParticipant.length
        ? fromParticipant[0].name
        : "Unknown",
      toParticipantName: toParticipant.length
        ? toParticipant[0].name
        : "Unknown",
    };
  }

  return {
    ...mapSettlement(settlement),
    fromParticipantName: fromParticipant[0].name,
    toParticipantName: toParticipant[0].name,
  };
};

/**
 * Get all settlements for a trip with enriched participant names
 * Sorted by date descending (most recent first)
 *
 * @param tripId - Trip ID
 * @returns Array of settlements with participant names
 */
export const getSettlementsForTrip = async (
  tripId: string,
): Promise<SettlementWithParticipants[]> => {
  // Fetch all settlements for trip
  const settlements = await db
    .select()
    .from(settlementsTable)
    .where(eq(settlementsTable.tripId, tripId));

  if (!settlements.length) {
    settlementLogger.debug("No settlements found for trip", { tripId });
    return [];
  }

  // Fetch all participants for the trip (avoid N+1 query)
  const participants = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.tripId, tripId));

  const participantMap = new Map(participants.map((p) => [p.id, p.name]));

  // Enrich settlements with participant names
  const enriched: SettlementWithParticipants[] = settlements.map((s) => ({
    ...mapSettlement(s),
    fromParticipantName: participantMap.get(s.fromParticipantId) ?? "Unknown",
    toParticipantName: participantMap.get(s.toParticipantId) ?? "Unknown",
  }));

  // Sort by date descending (most recent first)
  enriched.sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return a.id.localeCompare(b.id); // Deterministic tie-breaker
  });

  settlementLogger.debug("Loaded settlements for trip", {
    tripId,
    count: enriched.length,
  });

  return enriched;
};

/**
 * Get settlements linked to a specific expense split
 * Used to track which settlements are paying off a specific expense
 *
 * @param expenseSplitId - Expense split ID
 * @returns Array of settlements with participant names
 */
export const getSettlementsForExpenseSplit = async (
  expenseSplitId: string,
): Promise<SettlementWithParticipants[]> => {
  const settlements = await db
    .select()
    .from(settlementsTable)
    .where(eq(settlementsTable.expenseSplitId, expenseSplitId));

  if (!settlements.length) {
    settlementLogger.debug("No settlements found for expense split", {
      expenseSplitId,
    });
    return [];
  }

  // Get trip ID from first settlement to fetch participants
  const tripId = settlements[0].tripId;
  const participants = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.tripId, tripId));

  const participantMap = new Map(participants.map((p) => [p.id, p.name]));

  const enriched: SettlementWithParticipants[] = settlements.map((s) => ({
    ...mapSettlement(s),
    fromParticipantName: participantMap.get(s.fromParticipantId) ?? "Unknown",
    toParticipantName: participantMap.get(s.toParticipantId) ?? "Unknown",
  }));

  settlementLogger.debug("Loaded settlements for expense split", {
    expenseSplitId,
    count: enriched.length,
  });

  return enriched;
};

/**
 * Get settlements linked to a specific expense
 * Finds all settlements that reference any split of the given expense
 *
 * @param expenseId - Expense ID
 * @returns Array of settlements with participant names
 */
export const getSettlementsForExpense = async (
  expenseId: string,
): Promise<SettlementWithParticipants[]> => {
  // First, get all splits for the expense
  const splits = await db
    .select({ id: expenseSplitsTable.id })
    .from(expenseSplitsTable)
    .where(eq(expenseSplitsTable.expenseId, expenseId));

  if (!splits.length) {
    settlementLogger.debug("No splits found for expense", { expenseId });
    return [];
  }

  const splitIds = splits.map((s) => s.id);

  // Batch fetch all settlements for these splits (avoid N+1 query pattern)
  const settlements = await db
    .select()
    .from(settlementsTable)
    .where(inArray(settlementsTable.expenseSplitId, splitIds));

  if (!settlements.length) {
    settlementLogger.debug("No settlements found for expense", { expenseId });
    return [];
  }

  // Fetch participants once for all settlements
  const tripId = settlements[0].tripId;
  const participants = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.tripId, tripId));

  const participantMap = new Map(participants.map((p) => [p.id, p.name]));

  const allSettlements: SettlementWithParticipants[] = settlements.map((s) => ({
    ...mapSettlement(s),
    fromParticipantName: participantMap.get(s.fromParticipantId) ?? "Unknown",
    toParticipantName: participantMap.get(s.toParticipantId) ?? "Unknown",
  }));

  settlementLogger.debug("Loaded settlements for expense", {
    expenseId,
    count: allSettlements.length,
  });

  return allSettlements;
};

/**
 * Update an existing settlement
 * Re-computes currency conversion if amount or currency changed
 *
 * @param id - Settlement ID
 * @param patch - Fields to update
 * @param fxRateProvider - FX rate provider instance (required for dependency injection)
 * @returns Updated settlement with participant names
 */
export const updateSettlement = async (
  id: string,
  patch: UpdateSettlementData,
  fxRateProvider: CachedFxRateProvider,
): Promise<SettlementWithParticipants> => {
  settlementLogger.debug("Updating settlement (dual-write)", {
    settlementId: id,
  });

  try {
    // First, load settlement to get tripId and existing data
    const existing = await getSettlementById(id);
    if (!existing) {
      settlementLogger.error("Settlement not found on update", {
        settlementId: id,
      });
      throw createNotFoundError("SETTLEMENT_NOT_FOUND", "Settlement", id);
    }

    const tripCurrencyCode = await getTripCurrency(existing.tripId);

    // Determine new values (merge patch with existing)
    const originalCurrency =
      patch.originalCurrency ?? existing.originalCurrency;
    const originalAmountMinor =
      patch.originalAmountMinor ?? existing.originalAmountMinor;

    // Re-validate amount if changed
    if (patch.originalAmountMinor !== undefined && originalAmountMinor <= 0) {
      settlementLogger.error("Invalid updated settlement amount", {
        amountMinor: originalAmountMinor,
      });
      throw createAppError(
        "INVALID_SETTLEMENT_AMOUNT",
        "Settlement amount must be positive",
        { details: { amountMinor: originalAmountMinor } },
      );
    }

    // Re-compute currency conversion
    const { convertedAmountMinor, fxRateToTrip } = computeConversion(
      originalAmountMinor,
      originalCurrency,
      tripCurrencyCode,
      fxRateProvider,
    );

    // Build Automerge update payload
    const automergeUpdate: {
      originalAmountMinor?: number;
      originalCurrency?: string;
      convertedAmountMinor?: number;
      fxRateToTrip?: number | null;
      date?: string;
      description?: string | null;
      paymentMethod?: string | null;
    } = {
      originalCurrency,
      originalAmountMinor,
      convertedAmountMinor,
      fxRateToTrip,
    };

    if (patch.date !== undefined) automergeUpdate.date = patch.date;
    if (patch.description !== undefined)
      automergeUpdate.description = patch.description;
    if (patch.paymentMethod !== undefined)
      automergeUpdate.paymentMethod = patch.paymentMethod;

    // Step 1: Update settlement in Automerge document (source of truth)
    settlementLogger.debug("Updating settlement in Automerge", {
      settlementId: id,
      tripId: existing.tripId,
    });
    const doc = await automergeManager.updateSettlementData(
      existing.tripId,
      id,
      automergeUpdate,
    );

    // Step 2: Rebuild SQLite cache from Automerge doc
    settlementLogger.debug("Rebuilding SQLite cache", {
      tripId: existing.tripId,
    });
    await rebuildTripCache(existing.tripId, doc);

    // Step 3: Load and return from SQLite (cache layer) with participant names
    const settlement = await getSettlementById(id);
    if (!settlement) {
      throw createAppError(
        "CACHE_DESYNC",
        `Settlement ${id} updated in Automerge but missing from SQLite`,
        { details: { settlementId: id, tripId: existing.tripId } },
      );
    }

    settlementLogger.info("Settlement updated (dual-write)", {
      settlementId: id,
      tripId: existing.tripId,
    });

    return settlement;
  } catch (error) {
    settlementLogger.error("Failed to update settlement", {
      settlementId: id,
      error,
    });
    throw error;
  }
};

/**
 * Delete a settlement
 * Uses transaction to ensure atomicity
 *
 * @param id - Settlement ID
 * @throws Error if settlement not found
 */
export const deleteSettlement = async (id: string): Promise<void> => {
  settlementLogger.info("Deleting settlement (dual-write)", {
    settlementId: id,
  });

  try {
    // First, load settlement to get tripId for cache rebuild
    const existing = await getSettlementById(id);
    if (!existing) {
      settlementLogger.error("Settlement not found on delete", {
        settlementId: id,
      });
      throw createNotFoundError("SETTLEMENT_NOT_FOUND", "Settlement", id);
    }

    // Step 1: Remove settlement from Automerge document (source of truth)
    settlementLogger.debug("Removing settlement from Automerge", {
      settlementId: id,
      tripId: existing.tripId,
    });
    const doc = await automergeManager.removeSettlement(existing.tripId, id);

    // Step 2: Rebuild SQLite cache from Automerge doc
    settlementLogger.debug("Rebuilding SQLite cache", {
      tripId: existing.tripId,
    });
    await rebuildTripCache(existing.tripId, doc);

    settlementLogger.info("Settlement deleted (dual-write)", {
      settlementId: id,
      tripId: existing.tripId,
    });
  } catch (error) {
    settlementLogger.error("Failed to delete settlement", {
      settlementId: id,
      error,
    });
    throw error;
  }
};

/**
 * Export repository interface
 */
export const SettlementRepository = {
  createSettlement,
  getSettlementById,
  getSettlementsForTrip,
  getSettlementsForExpense,
  getSettlementsForExpenseSplit,
  updateSettlement,
  deleteSettlement,
};
