/**
 * EXCHANGERATE-API SERVICE
 * LOCAL DATA ENGINEER: Fallback FX rate data source
 *
 * ExchangeRate-API (open.er-api.com):
 * - Free open access endpoint (no API key required)
 * - Daily updates
 * - Attribution required in UI
 * - Caching explicitly allowed
 * - Rate limited but lenient (1 request/day is acceptable)
 *
 * Docs: https://www.exchangerate-api.com/docs/free
 *
 * ATTRIBUTION REQUIREMENT:
 * Must include "Exchange rates by ExchangeRate-API" in app UI
 * (typically in Settings > FX Rates screen)
 */

import { fxLogger } from "@utils/logger";
import { createAppError, createFxRateError } from "@utils/errors";
import type { RatePair } from "../types";

const EXCHANGERATE_API_BASE_URL = "https://open.er-api.com/v6";

/**
 * Response from ExchangeRate-API /latest endpoint
 * Example: GET /v6/latest/USD
 * {
 *   "result": "success",
 *   "provider": "https://www.exchangerate-api.com",
 *   "documentation": "https://www.exchangerate-api.com/docs/free",
 *   "terms_of_use": "https://www.exchangerate-api.com/terms",
 *   "time_last_update_unix": 1640995200,
 *   "time_last_update_utc": "Sat, 01 Jan 2022 00:00:00 +0000",
 *   "time_next_update_unix": 1641081600,
 *   "time_next_update_utc": "Sun, 02 Jan 2022 00:00:00 +0000",
 *   "time_eol_unix": 0,
 *   "base_code": "USD",
 *   "rates": {
 *     "USD": 1,
 *     "EUR": 0.8834,
 *     "GBP": 0.7392,
 *     ...
 *   }
 * }
 */
interface ExchangeRateApiResponse {
  result: "success" | "error";
  "error-type"?: string;
  provider?: string;
  documentation?: string;
  terms_of_use?: string;
  time_last_update_unix?: number;
  time_last_update_utc?: string;
  time_next_update_unix?: number;
  time_next_update_utc?: string;
  base_code?: string;
  rates?: Record<string, number>;
}

/**
 * Fetch options for rate retrieval
 */
export interface FetchRatesOptions {
  /** Base currency (default: USD) */
  baseCurrency?: string;
  /** Target currencies (optional, returns all if not specified) */
  targetCurrencies?: string[];
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Fetch latest exchange rates from ExchangeRate-API
 *
 * @param options - Fetch configuration
 * @returns Array of rate pairs
 * @throws Error if network request fails or API returns error
 */
export const fetchLatestRates = async (
  options: FetchRatesOptions = {},
): Promise<RatePair[]> => {
  const { baseCurrency = "USD", targetCurrencies, timeout = 10000 } = options;

  fxLogger.debug("Fetching rates from ExchangeRate-API", {
    baseCurrency,
    targetCurrencies: targetCurrencies?.join(",") ?? "all",
  });

  // Build URL (no query params, currency in path)
  const url = `${EXCHANGERATE_API_BASE_URL}/latest/${baseCurrency}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "CrewSplit/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      fxLogger.error("ExchangeRate-API HTTP error", {
        status: response.status,
      });
      throw createAppError(
        "EXCHANGERATE_API_ERROR",
        `HTTP ${response.status}: ${response.statusText}`,
        { status: response.status },
      );
    }

    const data: ExchangeRateApiResponse = await response.json();

    // Check for API error
    if (data.result === "error") {
      const errorType = data["error-type"] || "unknown";
      fxLogger.error("ExchangeRate-API returned error", { errorType });
      throw createAppError(
        "EXCHANGERATE_API_ERROR",
        `ExchangeRate-API error: ${errorType}`,
        { details: { errorType } },
      );
    }

    // Validate response
    if (!data.rates || typeof data.rates !== "object") {
      fxLogger.error("Invalid ExchangeRate-API response", { data });
      throw createAppError(
        "INVALID_RESPONSE",
        "Invalid response from ExchangeRate-API",
      );
    }

    const base = data.base_code || baseCurrency;

    // Filter to target currencies if specified
    let rates = data.rates;
    if (targetCurrencies && targetCurrencies.length > 0) {
      rates = Object.fromEntries(
        Object.entries(data.rates).filter(([currency]) =>
          targetCurrencies.includes(currency),
        ),
      );
    }

    // Convert to RatePair array (exclude base currency = 1.0)
    const ratePairs: RatePair[] = Object.entries(rates)
      .filter(([currency]) => currency !== base)
      .map(([quoteCurrency, rate]) => ({
        baseCurrency: base,
        quoteCurrency,
        rate,
      }));

    fxLogger.info("Fetched rates from ExchangeRate-API", {
      baseCurrency: base,
      lastUpdate: data.time_last_update_utc,
      rateCount: ratePairs.length,
    });

    return ratePairs;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        fxLogger.error("ExchangeRate-API request timeout", { timeout });
        throw createAppError("TIMEOUT", `Request timeout after ${timeout}ms`);
      }

      if ("code" in error && error.code) {
        // Already has error code, re-throw
        throw error;
      }
    }

    // Network or other error
    fxLogger.error("Failed to fetch from ExchangeRate-API", error);
    throw createAppError("NETWORK_ERROR", "Network error when fetching rates");
  }
};

/**
 * Fetch rate for a specific currency pair
 * Convenience wrapper around fetchLatestRates
 *
 * @param fromCurrency - Base currency
 * @param toCurrency - Target currency
 * @returns Single rate pair
 */
export const fetchRate = async (
  fromCurrency: string,
  toCurrency: string,
): Promise<RatePair> => {
  const rates = await fetchLatestRates({
    baseCurrency: fromCurrency,
    targetCurrencies: [toCurrency],
  });

  if (rates.length === 0) {
    fxLogger.error("Rate not found in ExchangeRate-API response", {
      fromCurrency,
      toCurrency,
    });
    throw createFxRateError("FX_RATE_NOT_FOUND", fromCurrency, toCurrency);
  }

  return rates[0];
};

/**
 * Check if ExchangeRate-API is reachable
 * Useful for network availability detection
 *
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns true if API is reachable
 */
export const checkAvailability = async (timeout = 5000): Promise<boolean> => {
  fxLogger.debug("Checking ExchangeRate-API availability");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Minimal GET request to /latest/USD (HEAD not supported)
    const response = await fetch(`${EXCHANGERATE_API_BASE_URL}/latest/USD`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const isAvailable = response.ok;
    fxLogger.debug("ExchangeRate-API availability check", {
      available: isAvailable,
    });
    return isAvailable;
  } catch (error) {
    clearTimeout(timeoutId);
    fxLogger.warn("ExchangeRate-API availability check failed", error);
    return false;
  }
};

/**
 * Get attribution text for UI display
 * REQUIRED by ExchangeRate-API terms of use
 */
export const getAttributionText = (): string => {
  return "Exchange rates by ExchangeRate-API";
};

/**
 * Get attribution link for UI display
 * REQUIRED by ExchangeRate-API terms of use
 */
export const getAttributionLink = (): string => {
  return "https://www.exchangerate-api.com";
};

/**
 * ExchangeRate-API service export
 */
export const ExchangeRateApiService = {
  fetchLatestRates,
  fetchRate,
  checkAvailability,
  getAttributionText,
  getAttributionLink,
};
