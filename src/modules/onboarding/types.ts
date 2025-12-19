export type OnboardingFlowId = "initial_onboarding" | "tour_mode";

export type OnboardingStepId =
  | "welcome"
  | "preferences"
  | "sample_trip_loaded"
  | "tour_started"
  | "tour_complete";

export type SampleDataTemplateId =
  | "summer_road_trip"
  | "family_beach_vacation"
  | "weekend_ski_trip"
  | "europe_backpacking";

export interface OnboardingState {
  id: OnboardingFlowId;
  isCompleted: boolean;
  completedSteps: OnboardingStepId[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface UserSettings {
  id: string; // Always 'default'
  primaryUserName: string | null;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}
