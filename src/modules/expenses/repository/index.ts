/**
 * EXPENSE REPOSITORY
 * LOCAL DATA ENGINEER: Multi-currency aware expense CRUD with ACID-safe writes
 *
 * DEPRECATED: Direct use of repository functions is deprecated.
 * Use ExpenseService for all new code.
 *
 * This file maintains backward compatibility with existing code while
 * the service layer is being adopted.
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
import * as ExpenseService from "../service/ExpenseService";
import { expenseRepositoryImpl } from "./expense-repository-impl";
import { tripRepositoryAdapter } from "./trip-repository-adapter";
import { categoryRepositoryAdapter } from "./category-repository-adapter";

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
 * @deprecated Use ExpenseService.createExpense instead
 */
export const addExpense = async (
  expenseData: CreateExpenseInput,
): Promise<Expense> => {
  return ExpenseService.createExpense(expenseData, {
    expenseRepository: expenseRepositoryImpl,
    tripRepository: tripRepositoryAdapter,
    categoryRepository: categoryRepositoryAdapter,
  });
};

/**
 * Query function - Get all expenses for a trip
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
 */
export const getExpenseById = async (id: string): Promise<Expense | null> => {
  return expenseRepositoryImpl.getById(id);
};

/**
 * @deprecated Use ExpenseService.updateExpense instead
 */
export const updateExpense = async (
  id: string,
  patch: UpdateExpenseInput,
): Promise<Expense> => {
  return ExpenseService.updateExpense(id, patch, {
    expenseRepository: expenseRepositoryImpl,
    tripRepository: tripRepositoryAdapter,
    categoryRepository: categoryRepositoryAdapter,
  });
};

/**
 * @deprecated Use ExpenseService.deleteExpense instead
 */
export const deleteExpense = async (id: string): Promise<void> => {
  return ExpenseService.deleteExpense(id, {
    expenseRepository: expenseRepositoryImpl,
  });
};

/**
 * Query function - Get expense splits
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
