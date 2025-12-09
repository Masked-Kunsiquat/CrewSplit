/**
 * DATABASE - Drizzle Schema
 * SYSTEM ARCHITECT: Core data model definition
 * All computations must derive from this schema
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * TRIPS TABLE
 * Core trip entity
 */
export const trips = sqliteTable('trips', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  startDate: text('start_date').notNull(), // ISO 8601
  endDate: text('end_date'), // ISO 8601
  currency: text('currency').notNull().default('USD'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * PARTICIPANTS TABLE
 * Trip members
 */
export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  avatarColor: text('avatar_color'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * EXPENSES TABLE
 * Individual expense records
 */
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amount: integer('amount').notNull(), // In cents
  currency: text('currency').notNull(),
  paidBy: text('paid_by').notNull().references(() => participants.id, { onDelete: 'restrict' }),
  category: text('category'),
  date: text('date').notNull(), // ISO 8601
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * EXPENSE_SPLITS TABLE
 * How each expense is divided among participants
 * SYSTEM ARCHITECT: This is the source of truth for all balance calculations
 */
export const expenseSplits = sqliteTable('expense_splits', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'restrict' }),
  share: real('share').notNull(), // Weight, percentage, or equal share
  shareType: text('share_type').notNull(), // 'equal' | 'percentage' | 'amount' | 'weight'
  amount: integer('amount'), // For 'amount' type (in cents)
});

// TODO: LOCAL DATA ENGINEER will add indexes for performance
// TODO: LOCAL DATA ENGINEER will implement migration scripts
