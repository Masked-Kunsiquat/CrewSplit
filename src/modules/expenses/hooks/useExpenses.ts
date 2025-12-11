/**
 * LOCAL DATA ENGINEER: Expenses Data Hooks
 * React hooks for accessing expense data with proper state management
 */

import { useEffect, useState } from 'react';
import { getExpensesForTrip, getExpenseById, getExpenseSplits } from '../repository';
import type { Expense, ExpenseSplit } from '../types';

/**
 * Hook to fetch all expenses for a trip
 * @param tripId - Trip UUID
 * @returns Object with expenses array, loading state, and error
 */
export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadExpenses() {
      try {
        setLoading(true);
        setError(null);
        const data = await getExpensesForTrip(tripId);
        if (mounted) {
          setExpenses(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load expenses'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadExpenses();

    return () => {
      mounted = false;
    };
  }, [tripId]);

  return { expenses, loading, error };
}

/**
 * Hook to fetch a single expense by ID with its splits
 * @param expenseId - Expense UUID
 * @returns Object with expense, splits, loading state, and error
 */
export function useExpenseWithSplits(expenseId: string) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadExpenseWithSplits() {
      try {
        setLoading(true);
        setError(null);

        // Fetch expense and splits in parallel
        const [expenseData, splitsData] = await Promise.all([
          getExpenseById(expenseId),
          getExpenseSplits(expenseId),
        ]);

        if (mounted) {
          setExpense(expenseData);
          setSplits(splitsData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load expense'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadExpenseWithSplits();

    return () => {
      mounted = false;
    };
  }, [expenseId]);

  return { expense, splits, loading, error };
}
