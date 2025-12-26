/**
 * EXPENSE CATEGORY REPOSITORY
 * LOCAL DATA ENGINEER: Category CRUD with trip-scoped categories
 */

import * as Crypto from "expo-crypto";
import { db } from "@db/client";
import { expenseCategories } from "@db/schema/expense-categories";
import { eq, and, isNull, or } from "drizzle-orm";
import { ExpenseCategory, CreateExpenseCategoryInput } from "../types";
import { createAppError, createNotFoundError } from "@utils/errors";

/**
 * Get all categories visible for a trip (global + trip-specific, non-archived)
 */
export const getCategoriesForTrip = async (
  tripId: string,
): Promise<ExpenseCategory[]> => {
  const rows = await db
    .select()
    .from(expenseCategories)
    .where(
      and(
        or(
          isNull(expenseCategories.tripId), // Global categories
          eq(expenseCategories.tripId, tripId), // Trip-specific categories
        ),
        eq(expenseCategories.isArchived, false), // Non-archived
      ),
    )
    .orderBy(expenseCategories.sortOrder);

  return rows.map((row) => ({
    ...row,
    tripId: row.tripId ?? undefined,
  }));
};

/**
 * Get a single category by ID
 */
export const getCategoryById = async (
  id: string,
): Promise<ExpenseCategory | null> => {
  const rows = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.id, id))
    .limit(1);

  if (!rows.length) return null;

  return {
    ...rows[0],
    tripId: rows[0].tripId ?? undefined,
  };
};

/**
 * Create custom category (trip-scoped)
 * System categories cannot be created via this method
 * Custom categories must be associated with a trip
 */
export const createCategory = async (
  input: CreateExpenseCategoryInput,
): Promise<ExpenseCategory> => {
  // Enforce trip-scoped requirement
  if (!input.tripId || input.tripId.trim() === "") {
    throw createAppError(
      "TRIP_ID_REQUIRED",
      "Custom categories must be associated with a trip",
    );
  }

  const now = new Date().toISOString();
  const categoryId = Crypto.randomUUID();

  const [created] = await db
    .insert(expenseCategories)
    .values({
      id: categoryId,
      name: input.name,
      emoji: input.emoji,
      tripId: input.tripId,
      isSystem: false,
      sortOrder: input.sortOrder ?? 1000,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return {
    ...created,
    tripId: created.tripId ?? undefined,
  };
};

/**
 * Archive category (soft delete)
 * Cannot delete system categories
 */
export const archiveCategory = async (id: string): Promise<void> => {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, id))
      .limit(1);

    if (!existing.length) {
      throw createNotFoundError("CATEGORY_NOT_FOUND", "Category", id);
    }
    if (existing[0].isSystem) {
      throw createAppError(
        "CANNOT_ARCHIVE_SYSTEM_CATEGORY",
        "Cannot archive system categories",
      );
    }

    await tx
      .update(expenseCategories)
      .set({ isArchived: true, updatedAt: new Date().toISOString() })
      .where(eq(expenseCategories.id, id));
  });
};

export const ExpenseCategoryRepository = {
  getCategoriesForTrip,
  getCategoryById,
  createCategory,
  archiveCategory,
};
