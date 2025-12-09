/**
 * STORE - Main Zustand Store
 * Global application state
 */

import { create } from 'zustand';
import { AppState } from './types';

export const useAppStore = create<AppState>((set) => ({
  // Current trip
  currentTripId: null,
  setCurrentTrip: (tripId) => set({ currentTripId: tripId }),

  // UI state
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Autofill state
  lastPayer: null,
  lastCategory: null,
  setLastPayer: (participantId) => set({ lastPayer: participantId }),
  setLastCategory: (category) => set({ lastCategory: category }),

  // Error handling
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
