/**
 * FRANKFURTER API SERVICE
 * LOCAL DATA ENGINEER: Primary FX rate data source
 *
 * Frankfurter API (api.frankfurter.dev):
 * - Free and open-source, no API key required
 * - Daily updates around 16:00 CET (ECB reference rates)
 * - Supports ~30 currencies, 30+ years of historical data
 * - Can change base currency and filter symbols
 * - Client-side friendly, self-hostable
 *
 * Docs: https://www.frankfurter.app/docs/
 */

import { fxLogger } from '@utils/logger';
import type { RatePair } from '../types';

const FRANKFURTER_BASE_URL = 'https://api.frankfurter.app';

/**
 * Response from Frankfurter /latest endpoint
 * Example: GET /latest?from=USD&to=EUR,GBP,JPY
 * {
 *   "amount": 1.0,
 *   "base": "USD",
 *   "date": "2025-01-15",
 *   "rates": {
 *     "EUR": 0.9234,
 *     "GBP": 0.7856,
 *     "JPY": 148.25
 *   }
 * }
 */
interface FrankfurterLatestResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Frankfurter API error response
 */
interface FrankfurterErrorResponse {
  message: string;
}

/**
 * Fetch options for rate retrieval
 */
export interface FetchRatesOptions {
  /** Base currency (default: EUR) */
  baseCurrency?: string;
  /** Target currencies (default: all supported by API) */
  targetCurrencies?: string[];
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Fetch latest exchange rates from Frankfurter API
 *
 * @param options - Fetch configuration
 * @returns Array of rate pairs
 * @throws Error if network request fails or API returns error
 */
export const fetchLatestRates = async (
  options: FetchRatesOptions = {}
): Promise<RatePair[]> => {
  const {
    baseCurrency = 'EUR',
    targetCurrencies,
    timeout = 10000,
  } = options;

  fxLogger.debug('Fetching rates from Frankfurter', {
    baseCurrency,
    targetCurrencies: targetCurrencies?.join(',') ?? 'all',
  });

  // Build URL with query params
  const url = new URL(`${FRANKFURTER_BASE_URL}/latest`);
  url.searchParams.set('from', baseCurrency);
  if (targetCurrencies && targetCurrencies.length > 0) {
    url.searchParams.set('to', targetCurrencies.join(','));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CrewSplit/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to parse error response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData: FrankfurterErrorResponse = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignore JSON parse errors
      }

      fxLogger.error('Frankfurter API error', { status: response.status, message: errorMessage });
      const error = new Error(`Frankfurter API error: ${errorMessage}`) as Error & { code: string };
      error.code = 'FRANKFURTER_API_ERROR';
      throw error;
    }

    const data: FrankfurterLatestResponse = await response.json();

    // Validate response
    if (!data.rates || typeof data.rates !== 'object') {
      fxLogger.error('Invalid Frankfurter response', { data });
      const error = new Error('Invalid response from Frankfurter API') as Error & { code: string };
      error.code = 'INVALID_RESPONSE';
      throw error;
    }

    // Convert to RatePair array
    const ratePairs: RatePair[] = Object.entries(data.rates).map(([quoteCurrency, rate]) => ({
      baseCurrency: data.base,
      quoteCurrency,
      rate,
    }));

    fxLogger.info('Fetched rates from Frankfurter', {
      baseCurrency: data.base,
      date: data.date,
      rateCount: ratePairs.length,
    });

    return ratePairs;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        fxLogger.error('Frankfurter request timeout', { timeout });
        const timeoutError = new Error(`Request timeout after ${timeout}ms`) as Error & { code: string };
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }

      if ('code' in error && error.code) {
        // Already has error code, re-throw
        throw error;
      }
    }

    // Network or other error
    fxLogger.error('Failed to fetch from Frankfurter', error);
    const networkError = new Error('Network error when fetching rates') as Error & { code: string };
    networkError.code = 'NETWORK_ERROR';
    throw networkError;
  }
};

/**
 * Fetch rates for a specific currency pair
 * Convenience wrapper around fetchLatestRates
 *
 * @param fromCurrency - Base currency
 * @param toCurrency - Target currency
 * @returns Single rate pair
 */
export const fetchRate = async (
  fromCurrency: string,
  toCurrency: string
): Promise<RatePair> => {
  const rates = await fetchLatestRates({
    baseCurrency: fromCurrency,
    targetCurrencies: [toCurrency],
  });

  if (rates.length === 0) {
    fxLogger.error('Rate not found in Frankfurter response', { fromCurrency, toCurrency });
    const error = new Error(`Rate not found for ${fromCurrency} to ${toCurrency}`) as Error & { code: string };
    error.code = 'RATE_NOT_FOUND';
    throw error;
  }

  return rates[0];
};

/**
 * Check if Frankfurter API is reachable
 * Useful for network availability detection
 *
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns true if API is reachable
 */
export const checkAvailability = async (timeout = 5000): Promise<boolean> => {
  fxLogger.debug('Checking Frankfurter availability');

  const headController = new AbortController();
  const headTimeoutId = setTimeout(() => headController.abort(), timeout);

  try {
    // Minimal request to /latest (defaults to EUR base)
    const response = await fetch(`${FRANKFURTER_BASE_URL}/latest`, {
      method: 'HEAD', // try HEAD first
      signal: headController.signal,
    });

    clearTimeout(headTimeoutId);

    if (response.status === 405) {
      // HEAD not supported, retry with GET
      fxLogger.debug('Frankfurter availability retrying with GET after 405 HEAD', {
        status: response.status,
      });

      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), timeout);
      try {
        const getResponse = await fetch(`${FRANKFURTER_BASE_URL}/latest`, {
          method: 'GET',
          signal: getController.signal,
        });
        clearTimeout(getTimeoutId);
        const isAvailable = getResponse.ok;
        fxLogger.debug('Frankfurter availability check (GET fallback)', {
          available: isAvailable,
          status: getResponse.status,
        });
        return isAvailable;
      } catch (error) {
        clearTimeout(getTimeoutId);
        fxLogger.warn('Frankfurter availability check failed (GET fallback)', error);
        return false;
      }
    }

    const isAvailable = response.ok;
    fxLogger.debug('Frankfurter availability check', { available: isAvailable, status: response.status });
    return isAvailable;
  } catch (error) {
    clearTimeout(headTimeoutId);
    fxLogger.warn('Frankfurter availability check failed', error);
    return false;
  }
};

/**
 * Get supported currencies from Frankfurter
 * NOTE: This list is hardcoded to avoid extra API call
 * Frankfurter supports all currencies from ECB reference rates
 *
 * Source: https://www.frankfurter.app/docs/
 */
export const getSupportedCurrencies = (): string[] => {
  return [
    'AUD', // Australian Dollar
    'BGN', // Bulgarian Lev
    'BRL', // Brazilian Real
    'CAD', // Canadian Dollar
    'CHF', // Swiss Franc
    'CNY', // Chinese Yuan
    'CZK', // Czech Koruna
    'DKK', // Danish Krone
    'EUR', // Euro
    'GBP', // British Pound
    'HKD', // Hong Kong Dollar
    'HUF', // Hungarian Forint
    'IDR', // Indonesian Rupiah
    'ILS', // Israeli New Shekel
    'INR', // Indian Rupee
    'ISK', // Icelandic Króna
    'JPY', // Japanese Yen
    'KRW', // South Korean Won
    'MXN', // Mexican Peso
    'MYR', // Malaysian Ringgit
    'NOK', // Norwegian Krone
    'NZD', // New Zealand Dollar
    'PHP', // Philippine Peso
    'PLN', // Polish Złoty
    'RON', // Romanian Leu
    'SEK', // Swedish Krona
    'SGD', // Singapore Dollar
    'THB', // Thai Baht
    'TRY', // Turkish Lira
    'USD', // US Dollar
    'ZAR', // South African Rand
  ];
};

/**
 * Frankfurter service export
 */
export const FrankfurterService = {
  fetchLatestRates,
  fetchRate,
  checkAvailability,
  getSupportedCurrencies,
};
