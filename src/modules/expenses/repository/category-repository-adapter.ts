/**
 * LOCAL DATA ENGINEER: Category Repository Adapter for Expense Service
 *
 * Adapter that wraps category repository calls for expense service use.
 * Only exposes minimal interface needed by expense service.
 */

import { db } from "@db/client";
import { expenseCategories } from "@db/schema/expense-categories";
import { eq } from "drizzle-orm";
import type { ICategoryRepository } from "../service/ExpenseService";

export class CategoryRepositoryAdapter implements ICategoryRepository {
  async exists(id: string): Promise<boolean> {
    const rows = await db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(eq(expenseCategories.id, id))
      .limit(1);

    return rows.length > 0;
  }
}

/**
 * Singleton instance for use in production code
 */
export const categoryRepositoryAdapter = new CategoryRepositoryAdapter();
