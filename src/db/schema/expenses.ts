/**
 * LOCAL DATA ENGINEER: Expense Schema
 * Individual expense records with integer amounts (cents)
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { trips } from './trips';
import { participants } from './participants';
import { expenseCategories } from './expense-categories';

/**
 * EXPENSES TABLE
 * Represents a single expense paid by one participant
 * IMPORTANT: Amounts stored as INTEGER in cents to avoid floating-point errors
 */
export const expenses = sqliteTable('expenses', {
  // UUID primary key
  id: text('id').primaryKey(),

  // Foreign key to trips table (CASCADE on delete)
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),

  // Expense details
  description: text('description').notNull(),

  // Amount in CENTS (integer) - e.g., $12.34 = 1234
  // This avoids floating-point precision issues
  amount: integer('amount').notNull(),

  // Currency (ISO 4217 code)
  currency: text('currency').notNull(),

  /**
   * Multi-currency support
   * - original fields capture the source entry currency/amount
   * - convertedAmountMinor is always in the trip currency
   * - fxRateToTrip is nullable when currencies match
   */
  originalCurrency: text('original_currency').notNull(),
  originalAmountMinor: integer('original_amount_minor').notNull(),
  fxRateToTrip: real('fx_rate_to_trip'),
  convertedAmountMinor: integer('converted_amount_minor').notNull(),

  // Foreign key to participants table (RESTRICT on delete - can't delete participant with expenses)
  paidBy: text('paid_by')
    .notNull()
    .references(() => participants.id, { onDelete: 'restrict' }),

  /**
   * Category reference
   * - If categoryId is set: FK to expense_categories table (RESTRICT on delete)
   * - If categoryId is NULL but category is set: legacy free-form text (pre-migration)
   * - Migration strategy: Populate categoryId from category text, fallback to "Other"
   */
  categoryId: text('category_id').references(() => expenseCategories.id, {
    onDelete: 'restrict',
  }),
  category: text('category'), // DEPRECATED: Keep for backward compat during migration

  // Date of expense (ISO 8601 string)
  date: text('date').notNull(),

  // Timestamps
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Export type inference for TypeScript
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
