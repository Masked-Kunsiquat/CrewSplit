/**
 * LOCAL DATA ENGINEER: Expense Repository Implementation
 *
 * Pure CRUD operations for expenses - no business logic.
 * All orchestration and validation happens in the service layer.
 */

import * as Crypto from "expo-crypto";
import { db } from "@db/client";
import { expenseSplits as expenseSplitsTable } from "@db/schema/expense-splits";
import {
  expenses as expensesTable,
  Expense as ExpenseRow,
} from "@db/schema/expenses";
import { mapExpenseFromDb } from "@db/mappers";
import { eq } from "drizzle-orm";
import type { Expense } from "../types";
import { expenseLogger } from "@utils/logger";
import type { IExpenseRepository } from "../service/ExpenseService";

const mapExpenseRow = (row: ExpenseRow): Expense => mapExpenseFromDb(row);

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
    const now = new Date().toISOString();

    expenseLogger.debug("Creating expense (repository)", {
      expenseId: data.id,
      tripId: data.tripId,
      amount: data.amount,
    });

    return db.transaction(async (tx) => {
      const [insertedExpense] = await tx
        .insert(expensesTable)
        .values({
          id: data.id,
          tripId: data.tripId,
          description: data.description,
          notes: data.notes,
          amount: data.amount,
          currency: data.currency,
          originalCurrency: data.originalCurrency,
          originalAmountMinor: data.originalAmountMinor,
          fxRateToTrip: data.fxRateToTrip,
          convertedAmountMinor: data.convertedAmountMinor,
          paidBy: data.paidBy,
          categoryId: data.categoryId,
          category: null, // Deprecated - no longer write to this column
          date: data.date,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (data.splits.length > 0) {
        expenseLogger.debug("Adding expense splits", {
          expenseId: data.id,
          splitCount: data.splits.length,
        });
        const splitRows = data.splits.map((split) => ({
          id: Crypto.randomUUID(),
          expenseId: data.id,
          participantId: split.participantId,
          share: split.share,
          shareType: split.shareType,
          amount: split.amount,
          createdAt: now,
          updatedAt: now,
        }));

        await tx.insert(expenseSplitsTable).values(splitRows);
      }

      expenseLogger.info("Expense created", {
        expenseId: data.id,
        tripId: data.tripId,
        amount: data.amount,
      });
      return mapExpenseRow(insertedExpense);
    });
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
    const now = new Date().toISOString();

    expenseLogger.debug("Updating expense (repository)", { expenseId: id });

    return db.transaction(async (tx) => {
      // Build update payload with only defined fields
      const updatePayload: Partial<typeof expensesTable.$inferInsert> = {
        updatedAt: now,
      };

      if (data.description !== undefined)
        updatePayload.description = data.description;
      if (data.notes !== undefined) updatePayload.notes = data.notes;
      if (data.amount !== undefined) updatePayload.amount = data.amount;
      if (data.currency !== undefined) updatePayload.currency = data.currency;
      if (data.originalCurrency !== undefined)
        updatePayload.originalCurrency = data.originalCurrency;
      if (data.originalAmountMinor !== undefined)
        updatePayload.originalAmountMinor = data.originalAmountMinor;
      if (data.fxRateToTrip !== undefined)
        updatePayload.fxRateToTrip = data.fxRateToTrip;
      if (data.convertedAmountMinor !== undefined)
        updatePayload.convertedAmountMinor = data.convertedAmountMinor;
      if (data.paidBy !== undefined) updatePayload.paidBy = data.paidBy;
      if (data.categoryId !== undefined)
        updatePayload.categoryId = data.categoryId;
      if (data.date !== undefined) updatePayload.date = data.date;

      updatePayload.category = null; // Deprecated - always null

      const [updated] = await tx
        .update(expensesTable)
        .set(updatePayload)
        .where(eq(expensesTable.id, id))
        .returning();

      if (!updated) {
        expenseLogger.error("Expense not found on update", { expenseId: id });
        throw new Error(`Expense not found for id ${id}`);
      }

      if (data.splits !== undefined) {
        expenseLogger.debug("Updating expense splits", {
          expenseId: id,
          splitCount: data.splits.length,
        });
        await tx
          .delete(expenseSplitsTable)
          .where(eq(expenseSplitsTable.expenseId, id));
        if (data.splits.length > 0) {
          const splitRows = data.splits.map((split) => ({
            id: Crypto.randomUUID(),
            expenseId: id,
            participantId: split.participantId,
            share: split.share,
            shareType: split.shareType,
            amount: split.amount,
            createdAt: now,
            updatedAt: now,
          }));
          await tx.insert(expenseSplitsTable).values(splitRows);
        }
      }

      expenseLogger.info("Expense updated", { expenseId: id });
      return mapExpenseRow(updated);
    });
  }

  /**
   * Deletes an expense and all associated splits.
   *
   * @param id - Expense ID
   *
   * @throws {Error} If expense not found
   */
  async delete(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      const existingRows = await tx
        .select()
        .from(expensesTable)
        .where(eq(expensesTable.id, id))
        .limit(1);
      if (!existingRows.length) {
        expenseLogger.error("Expense not found on delete", { expenseId: id });
        throw new Error(`Expense not found for id ${id}`);
      }
      expenseLogger.info("Deleting expense", {
        expenseId: id,
        tripId: existingRows[0].tripId,
      });
      await tx.delete(expensesTable).where(eq(expensesTable.id, id));
      expenseLogger.info("Expense deleted", { expenseId: id });
    });
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
