/**
 * ONBOARDING - User Settings Hook
 * UI/UX ENGINEER: Manage global user preferences
 */

import { useState, useEffect, useCallback } from "react";
import { onboardingRepository } from "../repository/OnboardingRepository";
import type { UserSettings, UserPreferencesUpdate } from "../types";

/**
 * Hook for managing user settings (singleton)
 *
 * Provides:
 * - settings: Current user settings (default currency, primary user name)
 * - loading: Initial load state
 * - updateSettings: Update preferences
 *
 * @example
 * const { settings, loading, updateSettings } = useUserSettings();
 *
 * await updateSettings({ defaultCurrency: 'EUR' });
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const userSettings = await onboardingRepository.getUserSettings();
      setSettings(userSettings);
    } catch (err) {
      console.error("Failed to load user settings:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = useCallback(async (update: UserPreferencesUpdate) => {
    try {
      setError(null);
      const updated = await onboardingRepository.updateUserSettings(update);
      setSettings(updated);
      return updated;
    } catch (err) {
      console.error("Failed to update user settings:", err);
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refresh: loadSettings,
  };
}

/**
 * Hook for syncing device owner with user settings
 * Bridges legacy deviceOwner (AsyncStorage) with new user_settings table
 *
 * Use this during migration period to keep both in sync
 *
 * @example
 * const { syncToUserSettings } = useDeviceOwnerSync();
 * await syncToUserSettings(deviceOwnerName);
 */
export function useDeviceOwnerSync() {
  const { updateSettings } = useUserSettings();

  const syncToUserSettings = useCallback(
    async (deviceOwnerName: string | null) => {
      try {
        await updateSettings({ primaryUserName: deviceOwnerName });
      } catch (err) {
        console.error("Failed to sync device owner to user settings:", err);
        // Don't throw - this is best-effort sync
      }
    },
    [updateSettings],
  );

  return {
    syncToUserSettings,
  };
}
