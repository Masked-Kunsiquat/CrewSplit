/**
 * STATISTICS ENGINE: Calculate category spending totals and percentages
 * MODELER: Pure math, no UI assumptions
 */

import type { Expense, ExpenseCategory } from "@modules/expenses";
import type { CategorySpending } from "../types";

interface CategoryAccumulator {
  categoryId: string | null;
  categoryName: string;
  categoryEmoji: string | null;
  totalAmount: number;
  expenseCount: number;
}

const UNCATEGORIZED_KEY = "__uncategorized__";

export const calculateCategorySpending = (
  expenses: Expense[],
  categories: ExpenseCategory[],
): CategorySpending[] => {
  const categoryById = new Map<string, ExpenseCategory>();
  for (const category of categories) {
    categoryById.set(category.id, category);
  }

  const totalsByCategory = new Map<string, CategoryAccumulator>();

  const totalCost = expenses.reduce((total, expense) => {
    const amount = expense.convertedAmountMinor;
    const rawCategoryId = expense.categoryId ?? null;
    const key = rawCategoryId ?? UNCATEGORIZED_KEY;
    const existing = totalsByCategory.get(key);

    if (existing) {
      existing.totalAmount += amount;
      existing.expenseCount += 1;
    } else {
      let categoryName = "Uncategorized";
      let categoryEmoji: string | null = null;
      if (rawCategoryId) {
        const category = categoryById.get(rawCategoryId);
        if (category) {
          categoryName = category.name;
          categoryEmoji = category.emoji;
        } else {
          categoryName = "Unknown category";
        }
      }
      totalsByCategory.set(key, {
        categoryId: rawCategoryId,
        categoryName,
        categoryEmoji,
        totalAmount: amount,
        expenseCount: 1,
      });
    }

    return total + amount;
  }, 0);

  const totals = Array.from(totalsByCategory.values()).map((entry) => ({
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
    categoryEmoji: entry.categoryEmoji,
    totalAmount: entry.totalAmount,
    expenseCount: entry.expenseCount,
    percentage: totalCost > 0 ? (entry.totalAmount / totalCost) * 100 : 0,
  }));

  totals.sort((a, b) => {
    if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount;
    if (a.categoryName !== b.categoryName) {
      return a.categoryName.localeCompare(b.categoryName);
    }
    return String(a.categoryId).localeCompare(String(b.categoryId));
  });

  return totals;
};
