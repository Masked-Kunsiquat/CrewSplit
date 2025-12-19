/**
 * SYSTEM ARCHITECT: Onboarding Domain Types
 *
 * Type definitions for onboarding system, user settings, and sample data management
 */

// ============================================================================
// USER SETTINGS
// ============================================================================

/**
 * User settings entity (singleton)
 * Stores global app preferences
 */
export interface UserSettings {
  id: string; // Always 'default'
  primaryUserName: string | null;
  defaultCurrency: string; // ISO 4217 code
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Partial update for user settings
 * All fields optional
 */
export interface UserPreferencesUpdate {
  primaryUserName?: string | null;
  defaultCurrency?: string;
}

// ============================================================================
// ONBOARDING STATE
// ============================================================================

/**
 * Onboarding flow identifiers
 *
 * - initial_onboarding: First-time user setup (currency, name, walkthrough)
 * - tour_mode: Returning user feature tour (overlay-based)
 * - settlement_tour: Guided settlement feature walkthrough (future)
 * - multicurrency_tour: Multi-currency features tour (future)
 */
export type OnboardingFlowId =
  | "initial_onboarding"
  | "tour_mode"
  | "settlement_tour"
  | "multicurrency_tour";

/**
 * Onboarding step identifiers
 * Step IDs are stored as JSON array in database
 */
export type OnboardingStepId =
  // Initial onboarding steps
  | "welcome"
  | "set_currency"
  | "set_username"
  | "walkthrough"
  | "sample_trip_loaded"
  | "onboarding_complete"
  // Tour mode steps
  | "tour_started"
  | "tour_trips"
  | "tour_expenses"
  | "tour_settlements"
  | "tour_multicurrency"
  | "tour_complete";

/**
 * Onboarding state entity
 * Tracks progress through a specific flow
 */
export interface OnboardingState {
  id: OnboardingFlowId;
  isCompleted: boolean;
  completedSteps: OnboardingStepId[]; // Parsed from JSON
  metadata: Record<string, unknown>; // Parsed from JSON
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  completedAt: string | null; // ISO 8601 | null
}

/**
 * Onboarding progress summary
 * Used for UI progress indicators
 */
export interface OnboardingProgress {
  flowId: OnboardingFlowId;
  completedSteps: OnboardingStepId[];
  totalSteps: number;
  percentComplete: number; // 0-100
  isCompleted: boolean;
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

/**
 * Sample data template identifiers
 * Links trips to specific sample templates for restoration
 */
export type SampleDataTemplateId = "summer_road_trip" | "beach_weekend" | "ski_trip";

/**
 * Sample trip metadata (subset of Trip entity)
 * Used for querying and filtering sample trips
 */
export interface SampleTripMetadata {
  isSampleData: boolean;
  sampleDataTemplateId: SampleDataTemplateId | null;
  isArchived: boolean;
}

/**
 * Sample data template structure
 * Defines the JSON format for sample trip templates
 */
export interface SampleDataTemplate {
  templateId: SampleDataTemplateId;
  trip: {
    name: string;
    description: string | null;
    emoji: string | null;
    currency: string; // ISO 4217 code
    startDate: string; // ISO 8601
    endDate: string | null; // ISO 8601 | null
  };
  participants: Array<{
    name: string;
    avatarColor: string; // Hex color
  }>;
  expenses: Array<{
    description: string;
    amountMinor: number; // Amount in cents
    currency: string; // ISO 4217 code
    paidByIndex: number; // Index into participants array
    categoryId: string | null;
    date: string; // ISO 8601
    splits: Array<{
      participantIndex: number; // Index into participants array
      shareType: "equal" | "percentage" | "amount";
      shareValue: number; // 1 for equal, 0-100 for percentage, cents for amount
    }>;
  }>;
  settlements?: Array<{
    fromParticipantIndex: number; // Index into participants array
    toParticipantIndex: number; // Index into participants array
    amountMinor: number; // Amount in cents
    currency: string; // ISO 4217 code
    status: "pending" | "completed";
  }>;
}

// ============================================================================
// REPOSITORY ERRORS
// ============================================================================

/**
 * Error thrown when onboarding operation fails
 */
export class OnboardingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "OnboardingError";
  }
}

/**
 * Error codes for onboarding operations
 */
export const OnboardingErrorCode = {
  SETTINGS_NOT_FOUND: "SETTINGS_NOT_FOUND",
  STATE_NOT_FOUND: "STATE_NOT_FOUND",
  INVALID_FLOW_ID: "INVALID_FLOW_ID",
  INVALID_STEP_ID: "INVALID_STEP_ID",
  TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
  SAMPLE_DATA_LOAD_FAILED: "SAMPLE_DATA_LOAD_FAILED",
} as const;
