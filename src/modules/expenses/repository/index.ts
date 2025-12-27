/**
 * EXPENSE REPOSITORY
 * LOCAL DATA ENGINEER: Multi-currency aware expense CRUD with ACID-safe writes
 *
 * DEPRECATED: Direct use of repository functions is deprecated.
 * Use ExpenseService for all new code.
 *
 * This file maintains backward compatibility with existing code while
 * the service layer is being adopted.
 *
 * NOTE: Deprecated wrapper functions that called ExpenseService have been removed
 * to break circular dependencies. Use hooks or service layer directly.
 */

import { db } from "@db/client";
import { expenseSplits as expenseSplitsTable } from "@db/schema/expense-splits";
import {
  expenses as expensesTable,
  Expense as ExpenseRow,
} from "@db/schema/expenses";
import { mapExpenseFromDb } from "@db/mappers";
import { eq } from "drizzle-orm";
import {
  CreateExpenseInput,
  Expense,
  ExpenseSplit,
  UpdateExpenseInput,
} from "../types";
import { expenseLogger } from "@utils/logger";
// NOTE: ExpenseService import removed to avoid circular dependency.
// Use hooks (use-expense-mutations) or service layer directly.
import { expenseRepositoryImpl } from "./expense-repository-impl";

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

const mapExpenseRow = (row: ExpenseRow): Expense => mapExpenseFromDb(row);

/**
 * @deprecated This wrapper function has been removed to break circular dependencies.
 * Use `useExpenseMutations()` hook or call ExpenseService directly from non-repository code.
 *
 * Example:
 * import { createExpense } from '@modules/expenses/service/ExpenseService';
 * import { expenseRepositoryImpl, tripRepositoryAdapter, categoryRepositoryAdapter } from '@modules/expenses/repository';
 *
 * await createExpense(data, {
 *   expenseRepository: expenseRepositoryImpl,
 *   tripRepository: tripRepositoryAdapter,
 *   categoryRepository: categoryRepositoryAdapter,
 * });
 */
export const addExpense = (expenseData: CreateExpenseInput): never => {
  throw new Error(
    "addExpense() has been removed. Use useExpenseMutations() hook or ExpenseService.createExpense() directly.",
  );
};

/**
 * Query function - Get all expenses for a trip
 *
 * NOTE: Query functions (read operations) remain in the repository layer
 * as they don't require orchestration or cross-module coordination.
 * Only mutations (create/update/delete) go through the service layer.
 */
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

/**
 * Query function - Get expense by ID
 *
 * NOTE: Query functions remain in repository layer (no service layer needed).
 */
export const getExpenseById = async (id: string): Promise<Expense | null> => {
  return expenseRepositoryImpl.getById(id);
};

/**
 * @deprecated This wrapper function has been removed to break circular dependencies.
 * Use `useExpenseMutations()` hook or call ExpenseService.updateExpense() directly.
 */
export const updateExpense = (id: string, patch: UpdateExpenseInput): never => {
  throw new Error(
    "updateExpense() has been removed. Use useExpenseMutations() hook or ExpenseService.updateExpense() directly.",
  );
};

/**
 * @deprecated This wrapper function has been removed to break circular dependencies.
 * Use `useExpenseMutations()` hook or call ExpenseService.deleteExpense() directly.
 */
export const deleteExpense = (id: string): never => {
  throw new Error(
    "deleteExpense() has been removed. Use useExpenseMutations() hook or ExpenseService.deleteExpense() directly.",
  );
};

/**
 * Query function - Get expense splits
 *
 * NOTE: Query functions remain in repository layer (no service layer needed).
 */
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

/**
 * @deprecated Use ExpenseService directly instead
 */
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
