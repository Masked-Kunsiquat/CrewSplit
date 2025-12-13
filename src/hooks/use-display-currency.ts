/**
 * UI/UX ENGINEER: Display Currency Hook
 * React hook for managing user's display currency preference
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loadDisplayCurrency,
  saveDisplayCurrency,
  clearDisplayCurrency,
} from '@utils/display-currency-storage';

/**
 * Hook to manage display currency preference
 * @returns Object with displayCurrency, loading state, and setter functions
 */
export function useDisplayCurrency() {
  const [displayCurrency, setDisplayCurrencyState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load preference on mount
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const currency = await loadDisplayCurrency();
        if (mounted) {
          setDisplayCurrencyState(currency);
        }
      } catch (error) {
        console.error('Failed to load display currency:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  // Update preference
  const setDisplayCurrency = useCallback(async (currency: string | null) => {
    try {
      await saveDisplayCurrency(currency);
      setDisplayCurrencyState(currency);
    } catch (error) {
      console.error('Failed to save display currency:', error);
      throw error;
    }
  }, []);

  // Clear preference
  const clearPreference = useCallback(async () => {
    try {
      await clearDisplayCurrency();
      setDisplayCurrencyState(null);
    } catch (error) {
      console.error('Failed to clear display currency:', error);
      throw error;
    }
  }, []);

  return {
    displayCurrency,
    loading,
    setDisplayCurrency,
    clearPreference,
  };
}
