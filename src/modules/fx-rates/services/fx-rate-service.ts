/**
 * FX RATE SERVICE (Orchestrator)
 * LOCAL DATA ENGINEER: Unified service with fallback and retry logic
 *
 * Strategy:
 * 1. Try Frankfurter (primary, no attribution needed)
 * 2. Fall back to ExchangeRate-API if Frankfurter fails
 * 3. Persist successful results to database via FxRateRepository
 * 4. Refresh CachedFxRateProvider cache after successful update
 */

import { FrankfurterService } from "./frankfurter-service";
import { ExchangeRateApiService } from "./exchange-rate-api-service";
import { FxRateRepository } from "../repository";
import { cachedFxRateProvider } from "../provider";
import type { FxRateSource } from "@db/schema/fx-rates";
import type { RatePair } from "../types";
import { fxLogger } from "@utils/logger";

/**
 * Result of rate fetch operation
 */
export interface FetchResult {
  /** Source that provided the rates */
  source: FxRateSource;
  /** Fetched rate pairs */
  rates: RatePair[];
  /** When the rates were fetched */
  fetchedAt: string;
  /** Number of rates successfully persisted to database */
  persistedCount: number;
}

/**
 * Options for fetching and updating rates
 */
export interface UpdateRatesOptions {
  /** Base currency (default: EUR for Frankfurter, USD for ExchangeRate-API) */
  baseCurrency?: string;
  /** Target currencies (optional, fetches all if not specified) */
  targetCurrencies?: string[];
  /** Force use of specific source (skip fallback) */
  forceSource?: "frankfurter" | "exchangerate-api";
  /** Timeout per API call in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Fetch and update exchange rates from external APIs
 * Uses Frankfurter as primary, falls back to ExchangeRate-API
 *
 * @param options - Update configuration
 * @returns Fetch result with source and persisted count
 * @throws Error if all sources fail
 */
export const updateRates = async (
  options: UpdateRatesOptions = {},
): Promise<FetchResult> => {
  const {
    baseCurrency,
    targetCurrencies,
    forceSource,
    timeout = 10000,
  } = options;

  const fetchedAt = new Date().toISOString();

  // Try Frankfurter first (unless forced to use ExchangeRate-API)
  if (!forceSource || forceSource === "frankfurter") {
    try {
      fxLogger.info("Attempting to fetch rates from Frankfurter");

      const rates = await FrankfurterService.fetchLatestRates({
        baseCurrency: baseCurrency || "EUR", // Frankfurter defaults to EUR
        targetCurrencies,
        timeout,
      });

      // Persist to database
      const persistedCount = await FxRateRepository.batchUpdateRates({
        rates,
        source: "frankfurter",
        fetchedAt,
        metadata: { fetchedAt },
      });

      try {
        await cachedFxRateProvider.refreshCache();
      } catch (cacheError) {
        fxLogger.warn(
          "Failed to refresh FX cache after Frankfurter update",
          cacheError,
        );
      }

      fxLogger.info("Successfully updated rates from Frankfurter", {
        persistedCount,
      });

      return {
        source: "frankfurter",
        rates,
        fetchedAt,
        persistedCount,
      };
    } catch (error) {
      fxLogger.warn("Frankfurter fetch failed, trying fallback", error);

      // If forced to use Frankfurter, re-throw
      if (forceSource === "frankfurter") {
        throw error;
      }
      // Otherwise, continue to fallback
    }
  }

  // Try ExchangeRate-API as fallback (or if forced)
  try {
    fxLogger.info("Attempting to fetch rates from ExchangeRate-API");

    const rates = await ExchangeRateApiService.fetchLatestRates({
      baseCurrency: baseCurrency || "USD", // ExchangeRate-API defaults to USD
      targetCurrencies,
      timeout,
    });

    // Persist to database
    const persistedCount = await FxRateRepository.batchUpdateRates({
      rates,
      source: "exchangerate-api",
      fetchedAt,
      metadata: {
        fetchedAt,
        attribution: ExchangeRateApiService.getAttributionText(),
      },
    });

    try {
      await cachedFxRateProvider.refreshCache();
    } catch (cacheError) {
      fxLogger.warn(
        "Failed to refresh FX cache after ExchangeRate-API update",
        cacheError,
      );
    }

    fxLogger.info("Successfully updated rates from ExchangeRate-API", {
      persistedCount,
    });

    return {
      source: "exchangerate-api",
      rates,
      fetchedAt,
      persistedCount,
    };
  } catch (error) {
    fxLogger.error("All FX rate sources failed", error);
    const allFailedError = new Error(
      "Failed to fetch rates from all sources",
    ) as Error & { code: string };
    allFailedError.code = "ALL_SOURCES_FAILED";
    throw allFailedError;
  }
};

/**
 * Fetch rates for common currency pairs
 * Convenience method for initial app setup
 *
 * Common pairs:
 * - USD to: EUR, GBP, JPY, CAD, AUD
 * - EUR to: USD, GBP, JPY
 * - GBP to: USD, EUR
 *
 * @returns Fetch result
 */
export const updateCommonRates = async (): Promise<FetchResult> => {
  fxLogger.info("Updating common currency pairs");

  // Fetch USD-based rates first (most common base)
  const usdResult = await updateRates({
    baseCurrency: "USD",
    targetCurrencies: ["EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR"],
  });

  // Fetch EUR-based rates (second most common)
  try {
    await updateRates({
      baseCurrency: "EUR",
      targetCurrencies: ["USD", "GBP", "JPY", "CAD", "AUD"],
    });
  } catch (error) {
    fxLogger.warn("Failed to fetch EUR-based rates", error);
    // Don't fail if EUR fetch fails, USD rates are more important
  }

  // Fetch GBP-based rates
  try {
    await updateRates({
      baseCurrency: "GBP",
      targetCurrencies: ["USD", "EUR", "JPY"],
    });
  } catch (error) {
    fxLogger.warn("Failed to fetch GBP-based rates", error);
  }

  return usdResult;
};

/**
 * Check if any FX rate source is available
 * Useful for network connectivity detection
 *
 * @returns Object with availability status for each source
 */
export const checkSourceAvailability = async (): Promise<{
  frankfurter: boolean;
  exchangeRateApi: boolean;
  anyAvailable: boolean;
}> => {
  fxLogger.debug("Checking FX rate source availability");

  const [frankfurterAvailable, exchangeRateApiAvailable] = await Promise.all([
    FrankfurterService.checkAvailability(),
    ExchangeRateApiService.checkAvailability(),
  ]);

  const result = {
    frankfurter: frankfurterAvailable,
    exchangeRateApi: exchangeRateApiAvailable,
    anyAvailable: frankfurterAvailable || exchangeRateApiAvailable,
  };

  fxLogger.debug("Source availability check result", result);
  return result;
};

/**
 * FX Rate Service export
 */
export const FxRateService = {
  updateRates,
  updateCommonRates,
  checkSourceAvailability,
};
