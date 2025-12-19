import { useState, useEffect, useCallback } from "react";
import { onboardingRepository } from "../repository/OnboardingRepository";
import { UserSettings } from "../types";

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const userSettings = await onboardingRepository.getUserSettings();
      setSettings(userSettings);
    } catch (e) {
      console.error("Failed to fetch user settings", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    setLoading(true);
    try {
      const updatedSettings =
        await onboardingRepository.updateUserSettings(updates);
      setSettings(updatedSettings);
    } catch (e) {
      console.error("Failed to update user settings", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { settings, loading, updateSettings, refresh: fetchSettings };
}
