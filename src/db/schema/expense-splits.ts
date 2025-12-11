/**
 * LOCAL DATA ENGINEER: ExpenseSplit Schema
 * How expenses are divided among participants
 * SOURCE OF TRUTH for all balance calculations
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { expenses } from './expenses';
import { participants } from './participants';

/**
 * EXPENSE_SPLITS TABLE
 * Represents how a single expense is divided among participants
 * SYSTEM ARCHITECT: This is the authoritative source for all settlement math
 */
export const expenseSplits = sqliteTable('expense_splits', (t) => ({
  // UUID primary key
  id: t.text('id').primaryKey(),

  // Foreign key to expenses table (CASCADE on delete)
  expenseId: t.text('expense_id')
    .notNull()
    .references(() => expenses.id, { onDelete: 'cascade' }),

  // Foreign key to participants table (RESTRICT on delete)
  participantId: t.text('participant_id')
    .notNull()
    .references(() => participants.id, { onDelete: 'restrict' }),

  /**
   * Share value - interpretation depends on shareType:
   * - 'equal': ignored (each participant gets equal share)
   * - 'percentage': 0-100 representing percentage
   * - 'weight': positive number for weighted distribution
   * - 'amount': ignored (use amount field instead)
   */
  share: t.real('share').notNull(),

  /**
   * Share type determines how to calculate participant's portion
   * Database-level CHECK constraint ensures only valid values are stored
   */
  shareType: t.text('share_type')
    .notNull()
    .$type<'equal' | 'percentage' | 'weight' | 'amount'>(),

  /**
   * For 'amount' type splits: exact amount in CENTS (integer)
   * For other types: NULL
   * Must sum to expense.amount across all splits for same expense
   */
  amount: t.integer('amount'),

  // Timestamps
  createdAt: t.text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: t.text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}));

// Export type inference for TypeScript
export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type NewExpenseSplit = typeof expenseSplits.$inferInsert;
