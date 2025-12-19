/**
 * LOCAL DATA ENGINEER: Trip Schema
 * Core trip entity with UUID primary key
 *
 * Updated: Added sample data tracking for onboarding system
 */

import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * TRIPS TABLE
 * Represents a trip or event for expense tracking
 */
export const trips = sqliteTable("trips", {
  // UUID primary key
  id: text("id").primaryKey(),

  // Trip details
  name: text("name").notNull(),
  description: text("description"),

  // Dates (ISO 8601 strings)
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),

  // Currency (ISO 4217 code: USD, EUR, GBP, etc.)
  currency: text("currency").notNull().default("USD"),
  currencyCode: text("currency_code").notNull().default("USD"),

  // Optional emoji for visual identification
  emoji: text("emoji"),

  // Timestamps
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),

  /**
   * Sample data tracking (for onboarding system)
   *
   * isSampleData: Marks trips loaded from sample data templates
   * - true: This is a demo/sample trip for onboarding
   * - false: User-created trip (default)
   *
   * Behavior:
   * - Sample trips show visual badge in UI
   * - When deleted, sample trips are archived (soft delete)
   * - User trips are hard deleted with confirmation
   */
  isSampleData: integer("is_sample_data", { mode: "boolean" })
    .notNull()
    .default(false),

  /**
   * Links to specific sample data template
   * Example: 'summer_road_trip', 'beach_weekend', etc.
   *
   * NULL for user-created trips
   * Used for restoring specific sample templates
   */
  sampleDataTemplateId: text("sample_data_template_id"),

  /**
   * Soft-delete flag for archiving trips
   *
   * Behavior:
   * - Sample trips: Set to true when user "deletes" them (can restore later)
   * - User trips: Hard deleted (CASCADE) instead of archived
   * - Archived trips hidden from trips list but data preserved
   *
   * Query pattern: WHERE is_archived = 0 (to show only active trips)
   */
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),
});

// Export type inference for TypeScript
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
