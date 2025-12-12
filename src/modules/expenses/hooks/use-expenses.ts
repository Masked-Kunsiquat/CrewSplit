/**
 * LOCAL DATA ENGINEER: Expenses Data Hooks
 * React hooks for accessing expense data with proper state management
 */

import { useQuery } from '../../../hooks';
import { getExpensesForTrip, getExpenseById, getExpenseSplits } from '../repository';
import type { Expense, ExpenseSplit } from '../types';

/**
 * Hook to fetch all expenses for a trip
 * @param tripId - Trip UUID (nullable)
 * @returns Object with expenses array, loading state, and error
 */
export function useExpenses(tripId: string | null) {
  const { data: expenses, loading, error } = useQuery(
    () => (tripId ? getExpensesForTrip(tripId) : Promise.resolve<Expense[]>([])),
    [tripId],
    [],
    'Failed to load expenses'
  );

  return { expenses, loading, error };
}

/**
 * Hook to fetch a single expense by ID with its splits (parallel fetch)
 * @param expenseId - Expense UUID
 * @returns Object with expense, splits, loading state, and error
 */
export function useExpenseWithSplits(expenseId: string) {
  const {
    data,
    loading,
    error,
  } = useQuery(
    async () => {
      // Fetch expense and splits in parallel
      const [expenseData, splitsData] = await Promise.all([
        getExpenseById(expenseId),
        getExpenseSplits(expenseId),
      ]);

      return { expense: expenseData, splits: splitsData };
    },
    [expenseId],
    { expense: null, splits: [] },
    'Failed to load expense'
  );

  return { expense: data.expense, splits: data.splits, loading, error };
}
