/**
 * LOCAL DATA ENGINEER: User Settings Schema
 *
 * Single-row table for global app preferences (singleton pattern)
 *
 * Design: Uses fixed ID 'default' to enforce single row
 * All columns nullable to support gradual preference collection
 */

import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * USER_SETTINGS TABLE
 * Global user preferences (singleton pattern)
 *
 * IMPORTANT: Only one row should exist (enforced by singleton ID 'default')
 *
 * Purpose:
 * - Store user's default currency preference
 * - Store primary user name (auto-added to new trips)
 * - Single source of truth for global preferences
 *
 * Why database instead of AsyncStorage:
 * - Single source of truth (aligns with project principles)
 * - Enables deterministic queries
 * - Supports atomic updates with trips/expenses
 * - Future-proof for backup/sync features
 */
export const userSettings = sqliteTable("user_settings", {
  /**
   * Singleton ID (always 'default')
   * Ensures only one row exists in table
   */
  id: text("id").primaryKey().default("default"),

  /**
   * User's preferred name for auto-fill
   * Nullable: User can skip during onboarding
   */
  primaryUserName: text("primary_user_name"),

  /**
   * Default currency for new trips
   * ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP')
   * Defaults to USD if not set
   */
  defaultCurrency: text("default_currency").notNull().default("USD"),

  /**
   * Timestamp when settings row was created
   */
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),

  /**
   * Timestamp when settings were last updated
   * Updated by trigger on any column change
   */
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/**
 * TypeScript types inferred from schema
 *
 * @example
 * const settings: UserSettings = await db.select().from(userSettings).get();
 * settings.defaultCurrency // => 'USD'
 * settings.primaryUserName // => 'John Doe' | null
 */
export type UserSettings = typeof userSettings.$inferSelect;

/**
 * Type for inserting new user settings
 * All fields optional except id (defaults to 'default')
 *
 * @example
 * await db.insert(userSettings).values({
 *   id: 'default',
 *   primaryUserName: 'John Doe',
 *   defaultCurrency: 'EUR',
 * });
 */
export type NewUserSettings = typeof userSettings.$inferInsert;
