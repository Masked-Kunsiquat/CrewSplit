/**
 * UTILITIES - Display Currency Storage
 * UI/UX ENGINEER: Persist user's display currency preference
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageLogger } from './logger';

const DISPLAY_CURRENCY_KEY = '@crewsplit:displayCurrency';

/**
 * Save display currency preference
 * @param currency - ISO 4217 currency code or null to clear
 */
export const saveDisplayCurrency = async (currency: string | null): Promise<void> => {
  try {
    if (currency === null) {
      await AsyncStorage.removeItem(DISPLAY_CURRENCY_KEY);
      storageLogger.info('Cleared display currency');
    } else {
      await AsyncStorage.setItem(DISPLAY_CURRENCY_KEY, currency);
      storageLogger.info('Saved display currency', { currency });
    }
  } catch (error) {
    storageLogger.error('Failed to save display currency', error);
    throw error;
  }
};

/**
 * Load display currency preference
 * @returns Currency code or null if not set
 * @throws Error when storage retrieval fails
 */
export const loadDisplayCurrency = async (): Promise<string | null> => {
  try {
    const currency = await AsyncStorage.getItem(DISPLAY_CURRENCY_KEY);
    if (currency) {
      storageLogger.debug('Loaded display currency', { currency });
    }
    return currency;
  } catch (error) {
    storageLogger.error('Failed to load display currency', error);
    return null;
  }
};

/**
 * Clear display currency preference
 */
export const clearDisplayCurrency = async (): Promise<void> => {
  await saveDisplayCurrency(null);
};
