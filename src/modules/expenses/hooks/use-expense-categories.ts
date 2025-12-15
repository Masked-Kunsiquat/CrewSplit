/**
 * EXPENSE CATEGORIES HOOK
 * UI/UX ENGINEER: React hook for expense categories with trip scope
 */

import { useEffect, useState } from 'react';
import { ExpenseCategory } from '../types';
import { ExpenseCategoryRepository } from '../repository/ExpenseCategoryRepository';

export const useExpenseCategories = (tripId: string) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ExpenseCategoryRepository.getCategoriesForTrip(tripId);

        if (!cancelled) {
          setCategories(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  return { categories, loading, error };
};
