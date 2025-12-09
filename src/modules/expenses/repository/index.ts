/**
 * EXPENSE REPOSITORY
 * LOCAL DATA ENGINEER: Multi-currency aware expense CRUD with ACID-safe writes
 */

import { db } from '@db/client';
import { expenseSplits as expenseSplitsTable } from '@db/schema/expense-splits';
import { expenses as expensesTable, Expense as ExpenseRow } from '@db/schema/expenses';
import { trips as tripsTable } from '@db/schema/trips';
import { mapExpenseFromDb } from '@db/mappers';
import { eq } from 'drizzle-orm';
import { CreateExpenseInput, Expense, ExpenseSplit, UpdateExpenseInput } from '../types';

const mapSplit = (row: typeof expenseSplitsTable.$inferSelect): ExpenseSplit => ({
  id: row.id,
  expenseId: row.expenseId,
  participantId: row.participantId,
  share: row.share,
  shareType: row.shareType,
  amount: row.amount ?? undefined,
});

const getTripCurrency = async (tripId: string): Promise<string> => {
  const rows = await db.select({ currencyCode: tripsTable.currencyCode }).from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1);
  if (!rows.length) {
    throw new Error(`Trip not found for id ${tripId}`);
  }
  return rows[0].currencyCode;
};

const computeConversion = (
  originalAmountMinor: number,
  originalCurrency: string,
  tripCurrencyCode: string,
  providedRate?: number | null,
  providedConverted?: number,
): { convertedAmountMinor: number; fxRateToTrip: number | null } => {
  if (originalCurrency === tripCurrencyCode) {
    return { convertedAmountMinor: originalAmountMinor, fxRateToTrip: 1 };
  }

  if (providedRate === undefined || providedRate === null) {
    throw new Error('fxRateToTrip is required when expense currency differs from trip currency');
  }
  if (providedRate <= 0) {
    throw new Error('fxRateToTrip must be positive');
  }

  const converted = providedConverted ?? Math.round(originalAmountMinor * providedRate);
  return { convertedAmountMinor: converted, fxRateToTrip: providedRate };
};

const mapExpenseRow = (row: ExpenseRow): Expense => mapExpenseFromDb(row);

const normalizeSplitAmount = (amount: number | undefined | null, fxRateToTrip: number | null): number | null => {
  if (amount === undefined || amount === null) return null;
  if (!fxRateToTrip || fxRateToTrip === 1) return amount;
  return Math.round(amount * fxRateToTrip);
};

export const addExpense = async (expenseData: CreateExpenseInput): Promise<Expense> => {
  const tripCurrencyCode = await getTripCurrency(expenseData.tripId);
  const { convertedAmountMinor, fxRateToTrip } = computeConversion(
    expenseData.originalAmountMinor,
    expenseData.originalCurrency,
    tripCurrencyCode,
    expenseData.fxRateToTrip ?? undefined,
    expenseData.convertedAmountMinor,
  );

  const now = new Date().toISOString();
  const expenseId = crypto.randomUUID();

  return db.transaction(async (tx) => {
    const [insertedExpense] = await tx
      .insert(expensesTable)
      .values({
        id: expenseId,
        tripId: expenseData.tripId,
        description: expenseData.description,
        amount: convertedAmountMinor,
        currency: tripCurrencyCode,
        originalCurrency: expenseData.originalCurrency,
        originalAmountMinor: expenseData.originalAmountMinor,
        fxRateToTrip,
        convertedAmountMinor,
        paidBy: expenseData.paidBy,
        category: expenseData.category,
        date: expenseData.date ?? now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (expenseData.splits?.length) {
      const splitRows = expenseData.splits.map((split) => ({
        id: crypto.randomUUID(),
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

    return mapExpenseRow(insertedExpense);
  });
};

export const getExpensesForTrip = async (tripId: string): Promise<Expense[]> => {
  const rows = await db.select().from(expensesTable).where(eq(expensesTable.tripId, tripId));
  return rows.map(mapExpenseRow);
};

export const getExpenseById = async (id: string): Promise<Expense | null> => {
  const rows = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).limit(1);
  if (!rows.length) return null;
  return mapExpenseRow(rows[0]);
};

export const updateExpense = async (id: string, patch: UpdateExpenseInput): Promise<Expense> => {
  const existingRows = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).limit(1);
  if (!existingRows.length) {
    throw new Error(`Expense not found for id ${id}`);
  }
  const existing = existingRows[0];
  const tripCurrencyCode = await getTripCurrency(existing.tripId);

  const originalCurrency = patch.originalCurrency ?? existing.originalCurrency;
  const originalAmountMinor = patch.originalAmountMinor ?? existing.originalAmountMinor;
  const { convertedAmountMinor, fxRateToTrip } = computeConversion(
    originalAmountMinor,
    originalCurrency,
    tripCurrencyCode,
    patch.fxRateToTrip ?? existing.fxRateToTrip ?? undefined,
    patch.convertedAmountMinor ?? existing.convertedAmountMinor,
  );

  const now = new Date().toISOString();
  const updatePayload: Partial<typeof expensesTable.$inferInsert> = {
    description: patch.description ?? existing.description,
    amount: convertedAmountMinor,
    currency: tripCurrencyCode,
    originalCurrency,
    originalAmountMinor,
    fxRateToTrip,
    convertedAmountMinor,
    paidBy: patch.paidBy ?? existing.paidBy,
    category: patch.category ?? existing.category,
    date: patch.date ?? existing.date,
    updatedAt: now,
  };

  return db.transaction(async (tx) => {
    const [updated] = await tx.update(expensesTable).set(updatePayload).where(eq(expensesTable.id, id)).returning();

    if (patch.splits) {
      await tx.delete(expenseSplitsTable).where(eq(expenseSplitsTable.expenseId, id));
      if (patch.splits.length) {
        const splitRows = patch.splits.map((split) => ({
          id: crypto.randomUUID(),
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

    return mapExpenseRow(updated);
  });
};

export const deleteExpense = async (id: string): Promise<void> => {
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
};

export const getExpenseSplits = async (expenseId: string): Promise<ExpenseSplit[]> => {
  const rows = await db.select().from(expenseSplitsTable).where(eq(expenseSplitsTable.expenseId, expenseId));
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
