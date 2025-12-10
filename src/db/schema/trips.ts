/**
 * LOCAL DATA ENGINEER: Trip Schema
 * Core trip entity with UUID primary key
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * TRIPS TABLE
 * Represents a trip or event for expense tracking
 */
export const trips = sqliteTable('trips', {
  // UUID primary key
  id: text('id').primaryKey(),

  // Trip details
  name: text('name').notNull(),
  description: text('description'),

  // Dates (ISO 8601 strings)
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),

  // Currency (ISO 4217 code: USD, EUR, GBP, etc.)
  currency: text('currency').notNull().default('USD'),
  currencyCode: text('currency_code').notNull().default('USD'),

  // Timestamps
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Export type inference for TypeScript
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
