/**
 * SETTLEMENTS REPOSITORY
 * LOCAL DATA ENGINEER: Multi-currency aware settlement CRUD with ACID-safe writes
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
import { cachedFxRateProvider } from "@modules/fx-rates/provider/cached-fx-rate-provider";

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
    const error = new Error(`Trip not found for id ${tripId}`) as Error & {
      code: string;
    };
    error.code = "TRIP_NOT_FOUND";
    throw error;
  }

  return rows[0].currencyCode;
};

/**
 * Compute currency conversion for settlement amount
 * Same logic as ExpenseRepository's computeConversion
 *
 * @returns convertedAmountMinor (in trip currency) and fxRateToTrip
 */
const computeConversion = (
  originalAmountMinor: number,
  originalCurrency: string,
  tripCurrencyCode: string,
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
    const fxRate = cachedFxRateProvider.getRate(
      originalCurrency,
      tripCurrencyCode,
    );
    const converted = Math.round(originalAmountMinor * fxRate);

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
    const fxError = new Error(
      `Exchange rate not available for ${originalCurrency} to ${tripCurrencyCode}. Please update FX rates.`,
    ) as Error & { code: string; fromCurrency: string; toCurrency: string };
    fxError.code = "FX_RATE_NOT_FOUND";
    fxError.fromCurrency = originalCurrency;
    fxError.toCurrency = tripCurrencyCode;
    throw fxError;
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
    const error = new Error(
      "From and to participants must be different",
    ) as Error & { code: string };
    error.code = "INVALID_SETTLEMENT_PARTICIPANTS";
    throw error;
  }

  // Ensure amount is positive
  if (amountMinor <= 0) {
    settlementLogger.error("Invalid settlement amount", { amountMinor });
    const error = new Error("Settlement amount must be positive") as Error & {
      code: string;
    };
    error.code = "INVALID_SETTLEMENT_AMOUNT";
    throw error;
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
    const error = new Error(
      `From participant ${fromParticipantId} not found in trip ${tripId}`,
    ) as Error & { code: string };
    error.code = "INVALID_FROM_PARTICIPANT";
    throw error;
  }

  if (!toExists.length) {
    settlementLogger.error("To participant not found in trip", {
      toParticipantId,
      tripId,
    });
    const error = new Error(
      `To participant ${toParticipantId} not found in trip ${tripId}`,
    ) as Error & { code: string };
    error.code = "INVALID_TO_PARTICIPANT";
    throw error;
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
      const error = new Error(
        `Expense split ${expenseSplitId} not found`,
      ) as Error & { code: string };
      error.code = "INVALID_EXPENSE_SPLIT";
      throw error;
    }
  }
};

/**
 * Create a new settlement
 * Validates participants, computes currency conversion, and persists to database
 *
 * @param data - New settlement data
 * @returns Created settlement with enriched participant names
 */
export const createSettlement = async (
  data: NewSettlementData,
): Promise<SettlementWithParticipants> => {
  const tripCurrencyCode = await getTripCurrency(data.tripId);

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
  );

  const now = new Date().toISOString();
  const settlementId = Crypto.randomUUID();

  settlementLogger.debug("Creating settlement", {
    settlementId,
    tripId: data.tripId,
    fromParticipantId: data.fromParticipantId,
    toParticipantId: data.toParticipantId,
    amountMinor: convertedAmountMinor,
  });

  return db.transaction(async (tx) => {
    // Insert settlement
    const [inserted] = await tx
      .insert(settlementsTable)
      .values({
        id: settlementId,
        tripId: data.tripId,
        fromParticipantId: data.fromParticipantId,
        toParticipantId: data.toParticipantId,
        expenseSplitId: data.expenseSplitId ?? null,
        originalCurrency: data.originalCurrency,
        originalAmountMinor: data.originalAmountMinor,
        fxRateToTrip,
        convertedAmountMinor,
        date: data.date,
        description: data.description ?? null,
        paymentMethod: data.paymentMethod ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Fetch participant names
    const [fromParticipant, toParticipant] = await Promise.all([
      tx
        .select({ name: participantsTable.name })
        .from(participantsTable)
        .where(eq(participantsTable.id, data.fromParticipantId))
        .limit(1),
      tx
        .select({ name: participantsTable.name })
        .from(participantsTable)
        .where(eq(participantsTable.id, data.toParticipantId))
        .limit(1),
    ]);

    settlementLogger.info("Settlement created", {
      settlementId,
      tripId: data.tripId,
      amountMinor: convertedAmountMinor,
    });

    // Defensive check for participant data
    if (!fromParticipant.length || !toParticipant.length) {
      settlementLogger.error(
        "Participant deleted concurrently during settlement creation",
        {
          settlementId,
          fromParticipantId: data.fromParticipantId,
          toParticipantId: data.toParticipantId,
        },
      );
      const error = new Error(
        "Participant was deleted during settlement creation",
      ) as Error & { code: string };
      error.code = "PARTICIPANT_DELETED";
      throw error;
    }

    return {
      ...mapSettlement(inserted),
      fromParticipantName: fromParticipant[0].name,
      toParticipantName: toParticipant[0].name,
    };
  });
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
 * @returns Updated settlement with participant names
 */
export const updateSettlement = async (
  id: string,
  patch: UpdateSettlementData,
): Promise<SettlementWithParticipants> => {
  // Fetch existing settlement
  const existingRows = await db
    .select()
    .from(settlementsTable)
    .where(eq(settlementsTable.id, id))
    .limit(1);

  if (!existingRows.length) {
    settlementLogger.error("Settlement not found on update", {
      settlementId: id,
    });
    const error = new Error(`Settlement not found for id ${id}`) as Error & {
      code: string;
    };
    error.code = "SETTLEMENT_NOT_FOUND";
    throw error;
  }

  const existing = existingRows[0];
  const tripCurrencyCode = await getTripCurrency(existing.tripId);

  // Determine new values (merge patch with existing)
  const originalCurrency = patch.originalCurrency ?? existing.originalCurrency;
  const originalAmountMinor =
    patch.originalAmountMinor ?? existing.originalAmountMinor;

  // Re-validate amount if changed
  if (patch.originalAmountMinor !== undefined && originalAmountMinor <= 0) {
    settlementLogger.error("Invalid updated settlement amount", {
      amountMinor: originalAmountMinor,
    });
    const error = new Error("Settlement amount must be positive") as Error & {
      code: string;
    };
    error.code = "INVALID_SETTLEMENT_AMOUNT";
    throw error;
  }

  // Re-compute currency conversion
  const { convertedAmountMinor, fxRateToTrip } = computeConversion(
    originalAmountMinor,
    originalCurrency,
    tripCurrencyCode,
  );

  const now = new Date().toISOString();
  const updatePayload: Partial<typeof settlementsTable.$inferInsert> = {
    originalCurrency,
    originalAmountMinor,
    fxRateToTrip,
    convertedAmountMinor,
    date: patch.date !== undefined ? patch.date : existing.date,
    description:
      patch.description !== undefined
        ? patch.description
        : existing.description,
    paymentMethod:
      patch.paymentMethod !== undefined
        ? patch.paymentMethod
        : existing.paymentMethod,
    updatedAt: now,
  };

  settlementLogger.debug("Updating settlement", {
    settlementId: id,
    tripId: existing.tripId,
  });

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(settlementsTable)
      .set(updatePayload)
      .where(eq(settlementsTable.id, id))
      .returning();

    // Fetch participant names
    const [fromParticipant, toParticipant] = await Promise.all([
      tx
        .select({ name: participantsTable.name })
        .from(participantsTable)
        .where(eq(participantsTable.id, updated.fromParticipantId))
        .limit(1),
      tx
        .select({ name: participantsTable.name })
        .from(participantsTable)
        .where(eq(participantsTable.id, updated.toParticipantId))
        .limit(1),
    ]);

    settlementLogger.info("Settlement updated", {
      settlementId: id,
      tripId: existing.tripId,
    });

    // Defensive check for participant data
    if (!fromParticipant.length || !toParticipant.length) {
      settlementLogger.error(
        "Participant deleted concurrently during settlement update",
        {
          settlementId: id,
          fromParticipantId: updated.fromParticipantId,
          toParticipantId: updated.toParticipantId,
        },
      );
      const error = new Error(
        "Participant was deleted during settlement update",
      ) as Error & { code: string };
      error.code = "PARTICIPANT_DELETED";
      throw error;
    }

    return {
      ...mapSettlement(updated),
      fromParticipantName: fromParticipant[0].name,
      toParticipantName: toParticipant[0].name,
    };
  });
};

/**
 * Delete a settlement
 * Uses transaction to ensure atomicity
 *
 * @param id - Settlement ID
 * @throws Error if settlement not found
 */
export const deleteSettlement = async (id: string): Promise<void> => {
  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(settlementsTable)
      .where(eq(settlementsTable.id, id))
      .limit(1);

    if (!existingRows.length) {
      settlementLogger.error("Settlement not found on delete", {
        settlementId: id,
      });
      const error = new Error(`Settlement not found for id ${id}`) as Error & {
        code: string;
      };
      error.code = "SETTLEMENT_NOT_FOUND";
      throw error;
    }

    settlementLogger.info("Deleting settlement", {
      settlementId: id,
      tripId: existingRows[0].tripId,
    });

    await tx.delete(settlementsTable).where(eq(settlementsTable.id, id));

    settlementLogger.info("Settlement deleted", { settlementId: id });
  });
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
