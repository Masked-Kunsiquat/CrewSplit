/**
 * LOCAL DATA ENGINEER: Expense Mutation Hooks
 * React hooks for creating/updating/deleting expenses
 * Uses ExpenseService for all mutations
 */

import { useState, useCallback } from "react";
import * as ExpenseService from "../service/ExpenseService";
import { expenseRepositoryImpl } from "../repository/expense-repository-impl";
import { tripRepositoryAdapter } from "../repository/trip-repository-adapter";
import { categoryRepositoryAdapter } from "../repository/category-repository-adapter";
import { getExpenseSplits } from "../repository";
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseSplit,
} from "../types";
import { expenseLogger } from "@utils/logger";
import { createAppError } from "@utils/errors";

/**
 * Hook for creating an expense with splits in a single atomic transaction
 * Uses ExpenseService for orchestration and validation
 */
export function useAddExpense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const add = useCallback(
    async (input: CreateExpenseInput): Promise<Expense> => {
      try {
        setLoading(true);
        setError(null);
        const newExpense = await ExpenseService.createExpense(input, {
          expenseRepository: expenseRepositoryImpl,
          tripRepository: tripRepositoryAdapter,
          categoryRepository: categoryRepositoryAdapter,
        });
        return newExpense;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : createAppError("OPERATION_FAILED", "Failed to create expense");
        expenseLogger.error("Failed to add expense", error);
        setError(error);
        throw error; // Re-throw so caller can handle
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { add, loading, error };
}

/**
 * Hook for updating an expense with splits in a single atomic transaction
 * Uses ExpenseService for orchestration and validation
 */
export function useUpdateExpense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (id: string, updates: UpdateExpenseInput): Promise<Expense> => {
      try {
        setLoading(true);
        setError(null);
        const updated = await ExpenseService.updateExpense(id, updates, {
          expenseRepository: expenseRepositoryImpl,
          tripRepository: tripRepositoryAdapter,
          categoryRepository: categoryRepositoryAdapter,
        });
        return updated;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : createAppError("OPERATION_FAILED", "Failed to update expense");
        expenseLogger.error("Failed to update expense", error);
        setError(error);
        throw error; // Re-throw so caller can handle
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { update, loading, error };
}

/**
 * Hook for deleting an expense
 * This will CASCADE delete all associated splits
 */
export function useDeleteExpense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await ExpenseService.deleteExpense(id, {
        expenseRepository: expenseRepositoryImpl,
      });
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : createAppError("OPERATION_FAILED", "Failed to delete expense");
      expenseLogger.error("Failed to delete expense", error);
      setError(error);
      throw error; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error };
}

/**
 * Hook for fetching expense splits for an expense
 */
export function useGetExpenseSplits() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getSplits = useCallback(
    async (expenseId: string): Promise<ExpenseSplit[]> => {
      try {
        setLoading(true);
        setError(null);
        const splits = await getExpenseSplits(expenseId);
        return splits;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : createAppError(
                "OPERATION_FAILED",
                "Failed to fetch expense splits",
              );
        expenseLogger.error("Failed to get expense splits", error);
        setError(error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { getSplits, loading, error };
}
