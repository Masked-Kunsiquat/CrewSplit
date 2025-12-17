/**
 * LOCAL DATA ENGINEER: Expense Categories Schema
 * Global and trip-scoped category definitions with emoji support
 */

import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { trips } from "./trips";

/**
 * EXPENSE_CATEGORIES TABLE
 * Defines available categories for expense classification
 *
 * SCOPE RULES:
 * - Global categories: tripId = NULL, isSystem = 1 (predefined, cannot delete)
 * - Trip-custom categories: tripId = <trip_id>, isSystem = 0 (user-defined)
 */
export const expenseCategories = sqliteTable("expense_categories", {
  // UUID primary key
  id: text("id").primaryKey(),

  // Category metadata
  name: text("name").notNull(), // e.g., "Food & Drinks", "Transportation"
  emoji: text("emoji").notNull(), // e.g., "🍔", "🚗"

  /**
   * Scope: NULL = global, <trip_id> = trip-specific
   * Foreign key to trips table (CASCADE on delete for trip-scoped)
   */
  tripId: text("trip_id").references(() => trips.id, { onDelete: "cascade" }),

  /**
   * System flag: 1 = predefined (cannot delete), 0 = user-created
   * System categories are global (tripId = NULL)
   */
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),

  /**
   * Sort order for UI display (lower = higher priority)
   * System categories: 0-999, custom: 1000+
   */
  sortOrder: integer("sort_order").notNull().default(1000),

  /**
   * Soft delete flag: 1 = archived (hidden from UI but preserved for data integrity)
   * Cannot hard-delete categories with expenses; must archive instead
   */
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),

  // Timestamps
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type NewExpenseCategory = typeof expenseCategories.$inferInsert;
