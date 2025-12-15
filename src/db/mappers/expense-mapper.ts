/**
 * DATABASE MAPPERS - Expense
 * LOCAL DATA ENGINEER: Convert between DB rows and domain models
 */

import { Expense as DbExpense, NewExpense } from '../schema/expenses';
import type { Expense } from '@modules/expenses';

export const mapExpenseFromDb = (record: DbExpense): Expense => ({
  id: record.id,
  tripId: record.tripId,
  description: record.description,
  amount: record.convertedAmountMinor,
  currency: record.currency,
  originalCurrency: record.originalCurrency,
  originalAmountMinor: record.originalAmountMinor,
  fxRateToTrip: record.fxRateToTrip ?? null,
  convertedAmountMinor: record.convertedAmountMinor,
  paidBy: record.paidBy,
  categoryId: record.categoryId ?? undefined,
  category: record.category ?? undefined,
  date: record.date,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const mapExpenseToDb = (expense: Expense): NewExpense => ({
  id: expense.id,
  tripId: expense.tripId,
  description: expense.description,
  amount: expense.convertedAmountMinor,
  currency: expense.currency,
  originalCurrency: expense.originalCurrency,
  originalAmountMinor: expense.originalAmountMinor,
  fxRateToTrip: expense.fxRateToTrip ?? null,
  convertedAmountMinor: expense.convertedAmountMinor,
  paidBy: expense.paidBy,
  categoryId: expense.categoryId,
  category: expense.category,
  date: expense.date,
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt,
});
