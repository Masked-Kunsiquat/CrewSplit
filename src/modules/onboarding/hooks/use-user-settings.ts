import { useState, useEffect, useCallback } from "react";
import { onboardingRepository } from "../repository/OnboardingRepository";
import { UserSettings } from "../types";

/**
 * React hook that manages user settings and exposes their loading and error state.
 *
 * @returns An object with:
 * - `settings` — the current `UserSettings` or `null` if not loaded.
 * - `loading` — `true` when a fetch or update is in progress, `false` otherwise.
 * - `error` — the last `Error` encountered during fetch or update, or `null` if none.
 * - `updateSettings` — a function that accepts `Partial<UserSettings>` to apply updates and update the stored settings; rethrows any error that occurs.
 * - `refresh` — a function that re-fetches and replaces the stored settings.
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userSettings = await onboardingRepository.getUserSettings();
      setSettings(userSettings);
      setError(null);
    } catch (e) {
      console.error("Failed to fetch user settings", e);
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedSettings =
        await onboardingRepository.updateUserSettings(updates);
      setSettings(updatedSettings);
      setError(null);
    } catch (e) {
      console.error("Failed to update user settings", e);
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { settings, loading, error, updateSettings, refresh: fetchSettings };
}
