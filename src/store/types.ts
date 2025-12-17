/**
 * STORE - Type Definitions
 */

import { Trip } from "../modules/trips/types";
import { Participant } from "../modules/participants/types";
import { Expense } from "../modules/expenses/types";

export interface AppState {
  // Current trip context
  currentTripId: string | null;
  setCurrentTrip: (tripId: string | null) => void;

  // UI state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Last used values for autofill
  lastPayer: string | null;
  lastCategory: string | null;
  setLastPayer: (participantId: string) => void;
  setLastCategory: (category: string) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}
