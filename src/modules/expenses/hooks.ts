/**
 * EXPENSES MODULE - React Hooks
 */

import { useCallback, useEffect, useState } from 'react';
import { addExpense, deleteExpense, getExpenseById, getExpensesForTrip, getExpenseSplits, updateExpense } from './repository';
import { CreateExpenseInput, Expense, ExpenseSplit, UpdateExpenseInput } from './types';

export const useExpenses = (tripId: string) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getExpensesForTrip(tripId);
      setExpenses(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  return { expenses, isLoading, error, refresh: load };
};

export const useExpense = (id: string) => {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getExpenseById(id);
      setExpense(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { expense, isLoading, error, refresh: load };
};

export const useAddExpense = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const add = useCallback(async (input: CreateExpenseInput) => {
    setIsSaving(true);
    setError(null);
    try {
      return await addExpense(input);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { addExpense: add, isSaving, error };
};

export const useUpdateExpense = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const update = useCallback(async (id: string, patch: UpdateExpenseInput) => {
    setIsSaving(true);
    setError(null);
    try {
      return await updateExpense(id, patch);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { updateExpense: update, isSaving, error };
};

export const useDeleteExpense = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteExpense(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteExpense: remove, isDeleting, error };
};

export const useExpenseSplits = (expenseId: string) => {
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!expenseId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getExpenseSplits(expenseId);
      setSplits(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    load();
  }, [load]);

  return { splits, isLoading, error, refresh: load };
};
