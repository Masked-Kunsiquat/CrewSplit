/**
 * STATISTICS ENGINE: Calculate category spending totals and percentages
 * MODELER: Pure math, no UI assumptions
 */

import type { CategorySpending } from "../types";

interface ExpenseForCategorySpending {
  categoryId?: string | null;
  convertedAmountMinor: number;
}

interface CategoryReference {
  id: string;
  name: string;
  emoji: string | null;
}

interface CategoryAccumulator {
  categoryId: string | null;
  categoryName: string;
  categoryEmoji: string | null;
  totalAmount: number;
  expenseCount: number;
}

const UNCATEGORIZED_KEY = "__uncategorized__";

export const calculateCategorySpending = (
  expenses: ExpenseForCategorySpending[],
  categories: CategoryReference[],
): CategorySpending[] => {
  const categoryById = new Map<string, CategoryReference>();
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
    // Handle null categoryIds explicitly for deterministic ordering
    if (a.categoryId === null && b.categoryId === null) return 0;
    if (a.categoryId === null) return 1; // null comes last
    if (b.categoryId === null) return -1; // null comes last
    return a.categoryId.localeCompare(b.categoryId);
  });

  return totals;
};
