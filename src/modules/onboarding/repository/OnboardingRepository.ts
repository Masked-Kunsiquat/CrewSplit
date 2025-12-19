/**
 * LOCAL DATA ENGINEER: Onboarding Repository
 *
 * Database access layer for onboarding system
 * Handles user settings, onboarding state, and sample data management
 */

import { db } from "@/db/client";
import {
  userSettings,
  onboardingState,
  trips,
  type Trip,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type {
  UserSettings,
  UserPreferencesUpdate,
  OnboardingFlowId,
  OnboardingStepId,
  OnboardingState,
} from "../types";
import { OnboardingError, OnboardingErrorCode } from "../types";

/**
 * Repository for onboarding-related database operations
 *
 * Responsibilities:
 * - Manage singleton user_settings table
 * - Track onboarding flow completion
 * - Archive/restore sample trips
 */
export class OnboardingRepository {
  // ============================================================================
  // USER SETTINGS (Singleton Pattern)
  // ============================================================================

  /**
   * Get user settings (singleton row)
   * Automatically creates default row if missing
   *
   * @returns User settings (always returns a row)
   * @throws OnboardingError if initialization fails
   */
  async getUserSettings(): Promise<UserSettings> {
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.id, "default"))
      .get();

    if (existing) {
      return existing;
    }

    // Auto-create default settings (migration should handle this, but defensive)
    console.warn(
      "User settings not found - initializing default row (migration may have failed)"
    );
    return this.initializeDefaultSettings();
  }

  /**
   * Update user settings (partial update)
   * Only updates provided fields, leaves others unchanged
   *
   * @param update - Fields to update
   * @returns Updated user settings
   */
  async updateUserSettings(
    update: UserPreferencesUpdate
  ): Promise<UserSettings> {
    await db
      .update(userSettings)
      .set({
        ...update,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userSettings.id, "default"))
      .run();

    return this.getUserSettings();
  }

  /**
   * Initialize default settings row (idempotent)
   * Safe to call multiple times - uses INSERT OR IGNORE pattern
   *
   * @returns Initialized user settings
   * @throws OnboardingError if initialization fails after retry
   */
  async initializeDefaultSettings(): Promise<UserSettings> {
    const defaultSettings = {
      id: "default",
      primaryUserName: null,
      defaultCurrency: "USD",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db
      .insert(userSettings)
      .values(defaultSettings)
      .onConflictDoNothing() // Idempotent
      .run();

    const result = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.id, "default"))
      .get();

    if (!result) {
      throw new OnboardingError(
        "Failed to initialize user settings",
        OnboardingErrorCode.SETTINGS_NOT_FOUND
      );
    }

    return result;
  }

  // ============================================================================
  // ONBOARDING STATE
  // ============================================================================

  /**
   * Get onboarding state for specific flow
   *
   * @param flowId - Flow identifier (e.g., 'initial_onboarding')
   * @returns Onboarding state or null if flow never started
   */
  async getOnboardingState(
    flowId: OnboardingFlowId
  ): Promise<OnboardingState | null> {
    const result = await db
      .select()
      .from(onboardingState)
      .where(eq(onboardingState.id, flowId))
      .get();

    if (!result) {
      return null;
    }

    // Parse JSON fields
    return {
      id: result.id as OnboardingFlowId,
      isCompleted: result.isCompleted,
      completedSteps: JSON.parse(result.completedSteps) as OnboardingStepId[],
      metadata: JSON.parse(result.metadata) as Record<string, unknown>,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      completedAt: result.completedAt,
    };
  }

  /**
   * Mark a specific step as completed
   * Creates flow state if it doesn't exist
   * Idempotent: Safe to call multiple times for same step
   *
   * @param flowId - Flow identifier
   * @param stepId - Step identifier to mark complete
   * @returns Updated onboarding state
   */
  async markStepCompleted(
    flowId: OnboardingFlowId,
    stepId: OnboardingStepId
  ): Promise<OnboardingState> {
    const existing = await this.getOnboardingState(flowId);

    if (!existing) {
      // Create new flow state
      const newState = {
        id: flowId,
        isCompleted: false,
        completedSteps: JSON.stringify([stepId]),
        metadata: JSON.stringify({}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };

      await db.insert(onboardingState).values(newState).run();
      const created = await this.getOnboardingState(flowId);
      if (!created) {
        throw new OnboardingError(
          `Failed to create onboarding state for flow: ${flowId}`,
          OnboardingErrorCode.STATE_NOT_FOUND
        );
      }
      return created;
    }

    // Add step if not already completed (use Set for deduplication)
    const completedSteps = Array.from(
      new Set([...existing.completedSteps, stepId])
    );

    await db
      .update(onboardingState)
      .set({
        completedSteps: JSON.stringify(completedSteps),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(onboardingState.id, flowId))
      .run();

    const updated = await this.getOnboardingState(flowId);
    if (!updated) {
      throw new OnboardingError(
        `Failed to update onboarding state for flow: ${flowId}`,
        OnboardingErrorCode.STATE_NOT_FOUND
      );
    }
    return updated;
  }

  /**
   * Mark entire flow as completed
   * Sets isCompleted = true and completedAt timestamp
   *
   * @param flowId - Flow identifier
   * @returns Updated onboarding state
   */
  async markFlowCompleted(flowId: OnboardingFlowId): Promise<OnboardingState> {
    const now = new Date().toISOString();

    // Ensure flow state exists before marking complete
    const existing = await this.getOnboardingState(flowId);
    if (!existing) {
      // Create flow in completed state
      const newState = {
        id: flowId,
        isCompleted: true,
        completedSteps: JSON.stringify([]),
        metadata: JSON.stringify({}),
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      };
      await db.insert(onboardingState).values(newState).run();
    } else {
      // Update existing flow
      await db
        .update(onboardingState)
        .set({
          isCompleted: true,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(onboardingState.id, flowId))
        .run();
    }

    const updated = await this.getOnboardingState(flowId);
    if (!updated) {
      throw new OnboardingError(
        `Failed to mark flow complete: ${flowId}`,
        OnboardingErrorCode.STATE_NOT_FOUND
      );
    }
    return updated;
  }

  /**
   * Reset onboarding flow (for testing or re-onboarding)
   * Deletes flow state row
   *
   * @param flowId - Flow identifier
   */
  async resetOnboardingFlow(flowId: OnboardingFlowId): Promise<void> {
    await db
      .delete(onboardingState)
      .where(eq(onboardingState.id, flowId))
      .run();
  }

  /**
   * Check if initial onboarding is completed
   * Convenience method for app startup logic
   *
   * @returns true if initial onboarding complete, false otherwise
   */
  async isInitialOnboardingCompleted(): Promise<boolean> {
    const state = await this.getOnboardingState("initial_onboarding");
    return state?.isCompleted ?? false;
  }

  // ============================================================================
  // SAMPLE DATA MANAGEMENT
  // ============================================================================

  /**
   * Get all sample trips
   *
   * @param includeArchived - Whether to include archived trips (default: false)
   * @returns Array of sample trips
   */
  async getSampleTrips(includeArchived = false): Promise<Trip[]> {
    let query = db.select().from(trips).where(eq(trips.isSampleData, true));

    const results = await query.all();

    if (!includeArchived) {
      return results.filter((trip) => !trip.isArchived);
    }

    return results;
  }

  /**
   * Archive all sample trips (soft delete)
   * Used when user dismisses sample data during onboarding
   *
   * Sets isArchived = true, preserving data for potential restoration
   */
  async archiveSampleTrips(): Promise<void> {
    await db
      .update(trips)
      .set({
        isArchived: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(trips.isSampleData, true))
      .run();
  }

  /**
   * Restore archived sample trips
   * Used when user wants to reload sample data from settings
   *
   * Sets isArchived = false for all sample trips
   */
  async restoreSampleTrips(): Promise<void> {
    await db
      .update(trips)
      .set({
        isArchived: false,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(trips.isSampleData, true), eq(trips.isArchived, true)))
      .run();
  }

  /**
   * Permanently delete all sample trips
   * CASCADE will delete participants, expenses, expense_splits, settlements
   *
   * WARNING: This is irreversible. Use archiveSampleTrips() for soft delete.
   */
  async deleteSampleTrips(): Promise<void> {
    await db.delete(trips).where(eq(trips.isSampleData, true)).run();
  }

  /**
   * Check if any sample data exists (including archived)
   *
   * @returns true if any sample trips exist
   */
  async hasSampleData(): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(eq(trips.isSampleData, true))
      .get();

    return (result?.count ?? 0) > 0;
  }

  /**
   * Check if any active (non-archived) sample data exists
   *
   * @returns true if active sample trips exist
   */
  async hasActiveSampleData(): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(and(eq(trips.isSampleData, true), eq(trips.isArchived, false)))
      .get();

    return (result?.count ?? 0) > 0;
  }
}

/**
 * Export singleton instance
 * Use this instance throughout the app for consistency
 */
export const onboardingRepository = new OnboardingRepository();
