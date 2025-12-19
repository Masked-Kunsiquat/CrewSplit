/**
 * LOCAL DATA ENGINEER: Onboarding State Schema
 *
 * Tracks user progress through onboarding flows and feature tours
 *
 * Design: Separate rows for different flows (initial_onboarding, tour_mode, etc.)
 * Allows independent tracking of multiple onboarding experiences
 */

import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * ONBOARDING_STATE TABLE
 * Tracks completion of onboarding steps and feature tours
 *
 * Purpose:
 * - Track which onboarding flows user has completed
 * - Store progress through multi-step flows
 * - Enable contextual tours (can be re-run)
 * - Differentiate between initial onboarding and in-app tours
 *
 * Design Pattern: One row per flow
 * - 'initial_onboarding' - First-time user setup
 * - 'tour_mode' - Returning user feature tour
 * - 'settlement_tour' - Guided settlement feature tour
 * - etc.
 */
export const onboardingState = sqliteTable("onboarding_state", {
  /**
   * Flow identifier (primary key)
   *
   * Examples:
   * - 'initial_onboarding' - First-time user experience
   * - 'tour_mode' - In-app feature tour
   * - 'settlement_tour' - Settlement feature walkthrough
   * - 'multicurrency_tour' - Multi-currency feature tour
   */
  id: text("id").primaryKey(),

  /**
   * Whether the entire flow has been completed
   * Set to true when user finishes all steps or dismisses flow
   */
  isCompleted: integer("is_completed", { mode: "boolean" })
    .notNull()
    .default(false),

  /**
   * JSON array of completed step IDs
   *
   * Stored as JSON to avoid schema changes when adding new steps
   * Parsed as string[] in application code
   *
   * @example
   * '["welcome", "preferences", "sample_trip_loaded"]'
   *
   * Parse with: JSON.parse(completedSteps) as string[]
   */
  completedSteps: text("completed_steps").notNull().default("[]"),

  /**
   * JSON object for extensible metadata
   *
   * Can store flow-specific data without schema changes
   *
   * @example
   * '{"lastStepViewed": "preferences", "dismissCount": 2, "resumeFrom": "walkthrough"}'
   *
   * Parse with: JSON.parse(metadata) as Record<string, unknown>
   */
  metadata: text("metadata").notNull().default("{}"),

  /**
   * Timestamp when flow state was created
   * Indicates when user first started this flow
   */
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),

  /**
   * Timestamp when flow state was last updated
   * Updated whenever steps are marked complete or metadata changes
   */
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),

  /**
   * Timestamp when flow was completed
   * NULL until isCompleted = true
   *
   * Useful for analytics:
   * - How long did onboarding take?
   * - When did user complete tour?
   */
  completedAt: text("completed_at"),
});

/**
 * TypeScript types inferred from schema
 *
 * @example
 * const state: OnboardingState = await db
 *   .select()
 *   .from(onboardingState)
 *   .where(eq(onboardingState.id, 'initial_onboarding'))
 *   .get();
 *
 * const steps = JSON.parse(state.completedSteps) as string[];
 */
export type OnboardingState = typeof onboardingState.$inferSelect;

/**
 * Type for inserting new onboarding state
 *
 * @example
 * await db.insert(onboardingState).values({
 *   id: 'initial_onboarding',
 *   isCompleted: false,
 *   completedSteps: JSON.stringify(['welcome']),
 * });
 */
export type NewOnboardingState = typeof onboardingState.$inferInsert;
