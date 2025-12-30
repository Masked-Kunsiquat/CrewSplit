/**
 * LOCAL DATA ENGINEER: Expense Repository Implementation
 *
 * Pure CRUD operations for expenses - no business logic.
 * All orchestration and validation happens in the service layer.
 * DUAL-WRITE: Writes to Automerge first, then rebuilds SQLite cache
 */

import { db } from "@db/client";
import {
  expenses as expensesTable,
  Expense as ExpenseRow,
} from "@db/schema/expenses";
import { mapExpenseFromDb } from "@db/mappers";
import { eq } from "drizzle-orm";
import type { Expense } from "../types";
import { expenseLogger } from "@utils/logger";
import type { IExpenseRepository } from "../service/types";
import { createNotFoundError, createAppError } from "@utils/errors";
import { AutomergeManager } from "@modules/automerge/service/AutomergeManager";
import { rebuildTripCache } from "@modules/automerge/repository/sqlite-cache-builder";

const mapExpenseRow = (row: ExpenseRow): Expense => mapExpenseFromDb(row);

/**
 * Singleton AutomergeManager instance for dual-write operations
 */
const automergeManager = new AutomergeManager();

/**
 * Map shareType from SQLite schema to Automerge schema
 *
 * SQLite uses: "equal" | "percentage" | "amount" | "weight"
 * Automerge uses: "equal" | "percentage" | "exact_amount" | "shares"
 */
function mapShareTypeToAutomerge(
  shareType: "equal" | "percentage" | "amount" | "weight",
): "equal" | "percentage" | "exact_amount" | "shares" {
  switch (shareType) {
    case "amount":
      return "exact_amount";
    case "weight":
      return "shares";
    case "equal":
      return "equal";
    case "percentage":
      return "percentage";
  }
}

/**
 * Concrete implementation of IExpenseRepository
 */
export class ExpenseRepositoryImpl implements IExpenseRepository {
  /**
   * Creates a new expense with splits in a single transaction.
   * All validation and conversion logic should be done before calling this.
   *
   * @param data - Pre-validated and converted expense data
   * @returns Created expense
   */
  async create(data: {
    id: string;
    tripId: string;
    description: string;
    notes: string | null;
    amount: number;
    currency: string;
    originalCurrency: string;
    originalAmountMinor: number;
    fxRateToTrip: number | null;
    convertedAmountMinor: number;
    paidBy: string;
    categoryId: string;
    date: string;
    splits: {
      participantId: string;
      share: number;
      shareType: "equal" | "percentage" | "amount" | "weight";
      amount: number | null;
    }[];
  }): Promise<Expense> {
    expenseLogger.debug("Creating expense (dual-write)", {
      expenseId: data.id,
      tripId: data.tripId,
      amount: data.amount,
    });

    try {
      // Transform splits from array to object structure for Automerge
      const splitsObject: {
        [participantId: string]: {
          shareType: "equal" | "percentage" | "exact_amount" | "shares";
          shareValue: number;
        };
      } = {};

      for (const split of data.splits) {
        splitsObject[split.participantId] = {
          shareType: mapShareTypeToAutomerge(split.shareType),
          shareValue: split.share,
        };
      }

      // Step 1: Add expense to Automerge document (source of truth)
      expenseLogger.debug("Adding expense to Automerge", {
        expenseId: data.id,
        tripId: data.tripId,
      });
      const doc = await automergeManager.addExpense(data.tripId, {
        id: data.id,
        description: data.description,
        originalAmountMinor: data.originalAmountMinor,
        originalCurrency: data.originalCurrency,
        convertedAmountMinor: data.convertedAmountMinor,
        fxRateToTrip: data.fxRateToTrip,
        categoryId: data.categoryId,
        paidById: data.paidBy,
        date: data.date,
        splits: splitsObject,
      });

      // Step 2: Rebuild SQLite cache from Automerge doc
      expenseLogger.debug("Rebuilding SQLite cache", { tripId: data.tripId });
      await rebuildTripCache(data.tripId, doc);

      // Step 3: Load and return from SQLite (cache layer)
      const expense = await this.getById(data.id);
      if (!expense) {
        throw createAppError(
          "CACHE_DESYNC",
          `Expense ${data.id} created in Automerge but missing from SQLite`,
          { details: { expenseId: data.id, tripId: data.tripId } },
        );
      }

      expenseLogger.info("Expense created (dual-write)", {
        expenseId: data.id,
        tripId: data.tripId,
        amount: data.amount,
      });
      return expense;
    } catch (error) {
      expenseLogger.error("Failed to create expense", {
        expenseId: data.id,
        tripId: data.tripId,
        error,
      });
      throw error;
    }
  }

  /**
   * Updates an existing expense with optional splits replacement.
   * All validation and conversion logic should be done before calling this.
   *
   * @param id - Expense ID
   * @param data - Partial update data
   * @returns Updated expense
   *
   * @throws {Error} If expense not found
   */
  async update(
    id: string,
    data: {
      description?: string;
      notes?: string | null;
      amount?: number;
      currency?: string;
      originalCurrency?: string;
      originalAmountMinor?: number;
      fxRateToTrip?: number | null;
      convertedAmountMinor?: number;
      paidBy?: string;
      categoryId?: string;
      date?: string;
      splits?: {
        participantId: string;
        share: number;
        shareType: "equal" | "percentage" | "amount" | "weight";
        amount: number | null;
      }[];
    },
  ): Promise<Expense> {
    expenseLogger.debug("Updating expense (dual-write)", { expenseId: id });

    try {
      // First, load expense to get tripId for cache rebuild
      const existing = await this.getById(id);
      if (!existing) {
        expenseLogger.error("Expense not found on update", { expenseId: id });
        throw createNotFoundError("EXPENSE_NOT_FOUND", "Expense", id);
      }

      // Build Automerge update payload
      const automergeUpdate: {
        description?: string;
        originalAmountMinor?: number;
        originalCurrency?: string;
        convertedAmountMinor?: number;
        fxRateToTrip?: number | null;
        categoryId?: string | null;
        paidById?: string;
        date?: string;
        splits?: {
          [participantId: string]: {
            shareType: "equal" | "percentage" | "exact_amount" | "shares";
            shareValue: number;
          };
        };
      } = {};

      if (data.description !== undefined)
        automergeUpdate.description = data.description;
      if (data.originalAmountMinor !== undefined)
        automergeUpdate.originalAmountMinor = data.originalAmountMinor;
      if (data.originalCurrency !== undefined)
        automergeUpdate.originalCurrency = data.originalCurrency;
      if (data.convertedAmountMinor !== undefined)
        automergeUpdate.convertedAmountMinor = data.convertedAmountMinor;
      if (data.fxRateToTrip !== undefined)
        automergeUpdate.fxRateToTrip = data.fxRateToTrip;
      if (data.categoryId !== undefined)
        automergeUpdate.categoryId = data.categoryId;
      if (data.paidBy !== undefined) automergeUpdate.paidById = data.paidBy;
      if (data.date !== undefined) automergeUpdate.date = data.date;

      // Transform splits if provided
      if (data.splits !== undefined) {
        const splitsObject: {
          [participantId: string]: {
            shareType: "equal" | "percentage" | "exact_amount" | "shares";
            shareValue: number;
          };
        } = {};

        for (const split of data.splits) {
          splitsObject[split.participantId] = {
            shareType: mapShareTypeToAutomerge(split.shareType),
            shareValue: split.share,
          };
        }

        automergeUpdate.splits = splitsObject;
      }

      // Step 1: Update expense in Automerge document (source of truth)
      expenseLogger.debug("Updating expense in Automerge", {
        expenseId: id,
        tripId: existing.tripId,
      });
      const doc = await automergeManager.updateExpenseData(
        existing.tripId,
        id,
        automergeUpdate,
      );

      // Step 2: Rebuild SQLite cache from Automerge doc
      expenseLogger.debug("Rebuilding SQLite cache", {
        tripId: existing.tripId,
      });
      await rebuildTripCache(existing.tripId, doc);

      // Step 3: Load and return from SQLite (cache layer)
      const expense = await this.getById(id);
      if (!expense) {
        throw createAppError(
          "CACHE_DESYNC",
          `Expense ${id} updated in Automerge but missing from SQLite`,
          { details: { expenseId: id, tripId: existing.tripId } },
        );
      }

      expenseLogger.info("Expense updated (dual-write)", { expenseId: id });
      return expense;
    } catch (error) {
      expenseLogger.error("Failed to update expense", { expenseId: id, error });
      throw error;
    }
  }

  /**
   * Deletes an expense and all associated splits.
   *
   * @param id - Expense ID
   *
   * @throws {Error} If expense not found
   */
  async delete(id: string): Promise<void> {
    expenseLogger.info("Deleting expense (dual-write)", { expenseId: id });

    try {
      // First, load expense to get tripId for cache rebuild
      const existing = await this.getById(id);
      if (!existing) {
        expenseLogger.error("Expense not found on delete", { expenseId: id });
        throw createNotFoundError("EXPENSE_NOT_FOUND", "Expense", id);
      }

      // Step 1: Remove expense from Automerge document (source of truth)
      expenseLogger.debug("Removing expense from Automerge", {
        expenseId: id,
        tripId: existing.tripId,
      });
      const doc = await automergeManager.removeExpense(existing.tripId, id);

      // Step 2: Rebuild SQLite cache from Automerge doc
      expenseLogger.debug("Rebuilding SQLite cache", {
        tripId: existing.tripId,
      });
      await rebuildTripCache(existing.tripId, doc);

      expenseLogger.info("Expense deleted (dual-write)", {
        expenseId: id,
        tripId: existing.tripId,
      });
    } catch (error) {
      expenseLogger.error("Failed to delete expense", { expenseId: id, error });
      throw error;
    }
  }

  /**
   * Retrieves an expense by ID.
   *
   * @param id - Expense ID
   * @returns Expense or null if not found
   */
  async getById(id: string): Promise<Expense | null> {
    const rows = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.id, id))
      .limit(1);
    if (!rows.length) {
      expenseLogger.warn("Expense not found", { expenseId: id });
      return null;
    }
    expenseLogger.debug("Loaded expense", {
      expenseId: id,
      tripId: rows[0].tripId,
    });
    return mapExpenseRow(rows[0]);
  }
}

/**
 * Singleton instance for use in production code
 */
export const expenseRepositoryImpl = new ExpenseRepositoryImpl();
