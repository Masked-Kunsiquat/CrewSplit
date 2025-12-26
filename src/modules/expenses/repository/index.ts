/**
 * EXPENSE REPOSITORY
 * LOCAL DATA ENGINEER: Multi-currency aware expense CRUD with ACID-safe writes
 */

import * as Crypto from "expo-crypto";
import { db } from "@db/client";
import { expenseSplits as expenseSplitsTable } from "@db/schema/expense-splits";
import {
  expenses as expensesTable,
  Expense as ExpenseRow,
} from "@db/schema/expenses";
import { expenseCategories } from "@db/schema/expense-categories";
import { trips as tripsTable } from "@db/schema/trips";
import { mapExpenseFromDb } from "@db/mappers";
import { eq } from "drizzle-orm";
import {
  CreateExpenseInput,
  Expense,
  ExpenseSplit,
  UpdateExpenseInput,
} from "../types";
import { expenseLogger } from "@utils/logger";
import { computeConversion } from "../engine";
import { CurrencyUtils } from "@utils/currency";

const mapSplit = (
  row: typeof expenseSplitsTable.$inferSelect,
): ExpenseSplit => ({
  id: row.id,
  expenseId: row.expenseId,
  participantId: row.participantId,
  share: row.share,
  shareType: row.shareType,
  amount: row.amount ?? undefined,
});

const getTripCurrency = async (tripId: string): Promise<string> => {
  const rows = await db
    .select({ currencyCode: tripsTable.currencyCode })
    .from(tripsTable)
    .where(eq(tripsTable.id, tripId))
    .limit(1);
  if (!rows.length) {
    expenseLogger.error("Trip not found for currency lookup", { tripId });
    throw new Error(`Trip not found for id ${tripId}`);
  }
  return rows[0].currencyCode;
};

/**
 * Wrapper around the pure computeConversion function that adds logging.
 * Business logic lives in the engine layer - this is just orchestration.
 */
const computeConversionWithLogging = (
  originalAmountMinor: number,
  originalCurrency: string,
  tripCurrencyCode: string,
  providedRate?: number | null,
  providedConverted?: number,
): { convertedAmountMinor: number; fxRateToTrip: number | null } => {
  try {
    const result = computeConversion({
      originalAmountMinor,
      originalCurrency,
      tripCurrencyCode,
      providedRate,
      providedConverted,
    });

    if (result.fxRateToTrip === null) {
      expenseLogger.debug("No currency conversion needed", {
        originalCurrency,
        tripCurrency: tripCurrencyCode,
      });
    } else {
      expenseLogger.debug("Currency converted", {
        originalCurrency,
        tripCurrency: tripCurrencyCode,
        fxRate: result.fxRateToTrip,
      });
    }

    return result;
  } catch (error) {
    expenseLogger.error("Currency conversion failed", {
      originalCurrency,
      tripCurrency: tripCurrencyCode,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

const mapExpenseRow = (row: ExpenseRow): Expense => mapExpenseFromDb(row);

const normalizeSplitAmount = (
  amount: number | undefined | null,
  fxRateToTrip: number | null,
): number | null => {
  if (amount === undefined || amount === null) return null;
  if (!fxRateToTrip || fxRateToTrip === 1) return amount;
  return CurrencyUtils.convertWithFxRate(amount, fxRateToTrip);
};

const normalizeNotes = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const addExpense = async (
  expenseData: CreateExpenseInput,
): Promise<Expense> => {
  const tripCurrencyCode = await getTripCurrency(expenseData.tripId);
  const { convertedAmountMinor, fxRateToTrip } = computeConversionWithLogging(
    expenseData.originalAmountMinor,
    expenseData.originalCurrency,
    tripCurrencyCode,
    expenseData.fxRateToTrip ?? undefined,
    expenseData.convertedAmountMinor,
  );

  // Default to "Other" category if not provided
  const categoryId = expenseData.categoryId ?? "cat-other";
  const now = new Date().toISOString();
  const expenseId = Crypto.randomUUID();

  expenseLogger.debug("Creating expense", {
    expenseId,
    tripId: expenseData.tripId,
    amountMinor: convertedAmountMinor,
    categoryId,
  });

  const notes = normalizeNotes(expenseData.notes);

  return db.transaction(async (tx) => {
    // Validate categoryId exists
    const categoryExists = await tx
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(eq(expenseCategories.id, categoryId))
      .limit(1);

    if (!categoryExists.length) {
      expenseLogger.error("Invalid category ID", { categoryId });
      const error = new Error(`Category not found: ${categoryId}`) as Error & {
        code: string;
      };
      error.code = "CATEGORY_NOT_FOUND";
      throw error;
    }
    const [insertedExpense] = await tx
      .insert(expensesTable)
      .values({
        id: expenseId,
        tripId: expenseData.tripId,
        description: expenseData.description,
        notes,
        amount: convertedAmountMinor,
        currency: tripCurrencyCode,
        originalCurrency: expenseData.originalCurrency,
        originalAmountMinor: expenseData.originalAmountMinor,
        fxRateToTrip,
        convertedAmountMinor,
        paidBy: expenseData.paidBy,
        categoryId,
        category: null, // Deprecated - no longer write to this column
        date: expenseData.date ?? now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (expenseData.splits?.length) {
      expenseLogger.debug("Adding expense splits", {
        expenseId,
        splitCount: expenseData.splits.length,
      });
      const splitRows = expenseData.splits.map((split) => ({
        id: Crypto.randomUUID(),
        expenseId,
        participantId: split.participantId,
        share: split.share,
        shareType: split.shareType,
        amount: normalizeSplitAmount(split.amount, fxRateToTrip),
        createdAt: now,
        updatedAt: now,
      }));

      await tx.insert(expenseSplitsTable).values(splitRows);
    }

    expenseLogger.info("Expense created", {
      expenseId,
      tripId: expenseData.tripId,
      amountMinor: convertedAmountMinor,
    });
    return mapExpenseRow(insertedExpense);
  });
};

export const getExpensesForTrip = async (
  tripId: string,
): Promise<Expense[]> => {
  const rows = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.tripId, tripId));
  expenseLogger.debug("Loaded expenses for trip", {
    tripId,
    count: rows.length,
  });
  return rows.map(mapExpenseRow);
};

export const getExpenseById = async (id: string): Promise<Expense | null> => {
  const rows = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.id, id))
    .limit(1);
  if (!rows.length) {
    expenseLogger.warn("Expense not found", { expenseId: id });
    return null;
  }
  expenseLogger.debug("Loaded expense", {
    expenseId: id,
    tripId: rows[0].tripId,
  });
  return mapExpenseRow(rows[0]);
};

export const updateExpense = async (
  id: string,
  patch: UpdateExpenseInput,
): Promise<Expense> => {
  const existingRows = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.id, id))
    .limit(1);
  if (!existingRows.length) {
    expenseLogger.error("Expense not found on update", { expenseId: id });
    throw new Error(`Expense not found for id ${id}`);
  }
  const existing = existingRows[0];
  const tripCurrencyCode = await getTripCurrency(existing.tripId);

  const originalCurrency = patch.originalCurrency ?? existing.originalCurrency;
  const originalAmountMinor =
    patch.originalAmountMinor ?? existing.originalAmountMinor;
  const { convertedAmountMinor, fxRateToTrip } = computeConversionWithLogging(
    originalAmountMinor,
    originalCurrency,
    tripCurrencyCode,
    patch.fxRateToTrip ?? existing.fxRateToTrip ?? undefined,
    patch.convertedAmountMinor ?? existing.convertedAmountMinor,
  );

  const categoryId = patch.categoryId ?? existing.categoryId;
  const now = new Date().toISOString();
  const normalizedNotes =
    patch.notes !== undefined ? normalizeNotes(patch.notes) : existing.notes;
  const updatePayload: Partial<typeof expensesTable.$inferInsert> = {
    description: patch.description ?? existing.description,
    notes: normalizedNotes,
    amount: convertedAmountMinor,
    currency: tripCurrencyCode,
    originalCurrency,
    originalAmountMinor,
    fxRateToTrip,
    convertedAmountMinor,
    paidBy: patch.paidBy ?? existing.paidBy,
    categoryId,
    category: null, // Deprecated - no longer write to this column
    date: patch.date ?? existing.date,
    updatedAt: now,
  };

  expenseLogger.debug("Updating expense", {
    expenseId: id,
    tripId: existing.tripId,
  });

  return db.transaction(async (tx) => {
    // If categoryId is being updated, validate it exists
    if (patch.categoryId !== undefined) {
      const categoryExists = await tx
        .select({ id: expenseCategories.id })
        .from(expenseCategories)
        .where(eq(expenseCategories.id, patch.categoryId))
        .limit(1);

      if (!categoryExists.length) {
        expenseLogger.error("Invalid category ID", {
          categoryId: patch.categoryId,
        });
        const error = new Error(
          `Category not found: ${patch.categoryId}`,
        ) as Error & { code: string };
        error.code = "CATEGORY_NOT_FOUND";
        throw error;
      }
    }

    const [updated] = await tx
      .update(expensesTable)
      .set(updatePayload)
      .where(eq(expensesTable.id, id))
      .returning();

    if (patch.splits) {
      expenseLogger.debug("Updating expense splits", {
        expenseId: id,
        splitCount: patch.splits.length,
      });
      await tx
        .delete(expenseSplitsTable)
        .where(eq(expenseSplitsTable.expenseId, id));
      if (patch.splits.length) {
        const splitRows = patch.splits.map((split) => ({
          id: Crypto.randomUUID(),
          expenseId: id,
          participantId: split.participantId,
          share: split.share,
          shareType: split.shareType,
          amount: normalizeSplitAmount(split.amount, fxRateToTrip),
          createdAt: now,
          updatedAt: now,
        }));
        await tx.insert(expenseSplitsTable).values(splitRows);
      }
    }

    expenseLogger.info("Expense updated", {
      expenseId: id,
      tripId: existing.tripId,
    });
    return mapExpenseRow(updated);
  });
};

export const deleteExpense = async (id: string): Promise<void> => {
  await db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, id))
      .limit(1);
    if (!existingRows.length) {
      expenseLogger.error("Expense not found on delete", { expenseId: id });
      throw new Error(`Expense not found for id ${id}`);
    }
    expenseLogger.info("Deleting expense", {
      expenseId: id,
      tripId: existingRows[0].tripId,
    });
    await tx.delete(expensesTable).where(eq(expensesTable.id, id));
    expenseLogger.info("Expense deleted", { expenseId: id });
  });
};

export const getExpenseSplits = async (
  expenseId: string,
): Promise<ExpenseSplit[]> => {
  const rows = await db
    .select()
    .from(expenseSplitsTable)
    .where(eq(expenseSplitsTable.expenseId, expenseId));
  expenseLogger.debug("Loaded expense splits", {
    expenseId,
    count: rows.length,
  });
  return rows.map(mapSplit);
};

export const ExpenseRepository = {
  addExpense,
  getExpensesForTrip,
  getExpenseById,
  updateExpense,
  deleteExpense,
};

export const ExpenseSplitRepository = {
  getExpenseSplits,
};
