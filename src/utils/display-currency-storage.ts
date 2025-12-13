/**
 * UTILITIES - Display Currency Storage
 * UI/UX ENGINEER: Persist user's display currency preference
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DISPLAY_CURRENCY_KEY = '@crewsplit:displayCurrency';

/**
 * Save display currency preference
 * @param currency - ISO 4217 currency code or null to clear
 */
export const saveDisplayCurrency = async (currency: string | null): Promise<void> => {
  try {
    if (currency === null) {
      await AsyncStorage.removeItem(DISPLAY_CURRENCY_KEY);
    } else {
      await AsyncStorage.setItem(DISPLAY_CURRENCY_KEY, currency);
    }
  } catch (error) {
    console.error('Failed to save display currency:', error);
    throw error;
  }
};

/**
 * Load display currency preference
 * @returns Currency code or null if not set
 * @throws Error when storage retrieval fails
 */
export const loadDisplayCurrency = async (): Promise<string | null> => {
  const currency = await AsyncStorage.getItem(DISPLAY_CURRENCY_KEY);
  return currency;
};

/**
 * Clear display currency preference
 */
export const clearDisplayCurrency = async (): Promise<void> => {
  await saveDisplayCurrency(null);
};
