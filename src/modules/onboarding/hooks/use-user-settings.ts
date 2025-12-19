import { useState, useEffect, useCallback } from "react";
import { onboardingRepository } from "../repository/OnboardingRepository";
import { UserSettings } from "../types";

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
    } finally {
      setLoading(false);
    }
  }, []);

  return { settings, loading, error, updateSettings, refresh: fetchSettings };
}
