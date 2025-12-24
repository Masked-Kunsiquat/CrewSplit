/**
 * STATISTICS REPOSITORY
 * LOCAL DATA ENGINEER: Trip-scoped statistics data access
 */

import { db } from "@db/client";
import { expenseCategories } from "@db/schema/expense-categories";
import { expenses as expensesTable } from "@db/schema/expenses";
import { trips as tripsTable } from "@db/schema/trips";
import { eq } from "drizzle-orm";
import { expenseLogger } from "@utils/logger";

export interface ExpenseWithCategory {
  id: string;
  tripId: string;
  description: string;
  notes: string | null;
  currency: string;
  originalCurrency: string;
  originalAmountMinor: number;
  fxRateToTrip: number | null;
  convertedAmountMinor: number;
  paidBy: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all expenses for a trip with joined category metadata.
 * Uses convertedAmountMinor for multi-currency handling.
 */
export const getExpensesWithCategories = async (
  tripId: string,
): Promise<ExpenseWithCategory[]> => {
  const rows = await db
    .select({
      id: expensesTable.id,
      tripId: expensesTable.tripId,
      description: expensesTable.description,
      notes: expensesTable.notes,
      currency: expensesTable.currency,
      originalCurrency: expensesTable.originalCurrency,
      originalAmountMinor: expensesTable.originalAmountMinor,
      fxRateToTrip: expensesTable.fxRateToTrip,
      convertedAmountMinor: expensesTable.convertedAmountMinor,
      paidBy: expensesTable.paidBy,
      categoryId: expensesTable.categoryId,
      categoryName: expenseCategories.name,
      categoryEmoji: expenseCategories.emoji,
      date: expensesTable.date,
      createdAt: expensesTable.createdAt,
      updatedAt: expensesTable.updatedAt,
    })
    .from(expensesTable)
    .leftJoin(
      expenseCategories,
      eq(expensesTable.categoryId, expenseCategories.id),
    )
    .where(eq(expensesTable.tripId, tripId));

  if (!rows.length) {
    expenseLogger.debug("No expenses found for statistics", { tripId });
    return [];
  }

  expenseLogger.debug("Loaded expenses with categories", {
    tripId,
    count: rows.length,
  });

  return rows;
};

/**
 * Get trip currency for a given trip ID
 * @throws Error if trip not found
 */
export const getTripCurrency = async (tripId: string): Promise<string> => {
  const rows = await db
    .select({ currencyCode: tripsTable.currencyCode })
    .from(tripsTable)
    .where(eq(tripsTable.id, tripId))
    .limit(1);

  if (!rows.length) {
    expenseLogger.error("Trip not found for currency lookup", { tripId });
    const error = new Error(`Trip not found for id ${tripId}`) as Error & {
      code: string;
    };
    error.code = "TRIP_NOT_FOUND";
    throw error;
  }

  return rows[0].currencyCode;
};

export const StatisticsRepository = {
  getExpensesWithCategories,
  getTripCurrency,
};
