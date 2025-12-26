/**
 * LOCAL DATA ENGINEER: Expense Mutation Hooks
 * React hooks for creating/updating/deleting expenses
 * The repository already handles atomic transactions for expense + splits
 */

import { useState, useCallback } from "react";
import {
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseSplits,
} from "../repository";
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseSplit,
} from "../types";
import { expenseLogger } from "@utils/logger";

/**
 * Hook for creating an expense with splits in a single atomic transaction
 * The repository handles wrapping expense + splits in a transaction
 */
export function useAddExpense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const add = useCallback(
    async (input: CreateExpenseInput): Promise<Expense | null> => {
      try {
        setLoading(true);
        setError(null);
        const newExpense = await addExpense(input);
        return newExpense;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to create expense");
        expenseLogger.error("Failed to add expense", error);
        setError(error);
        return null;
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
 * The repository handles wrapping expense + splits update in a transaction
 */
export function useUpdateExpense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (
      id: string,
      updates: UpdateExpenseInput,
    ): Promise<Expense | null> => {
      try {
        setLoading(true);
        setError(null);
        const updated = await updateExpense(id, updates);
        return updated;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to update expense");
        expenseLogger.error("Failed to update expense", error);
        setError(error);
        return null;
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
      await deleteExpense(id);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to delete expense");
      expenseLogger.error("Failed to delete expense", error);
      setError(error);
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
            : new Error("Failed to fetch expense splits");
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
