/**
 * CACHED FX RATE PROVIDER
 * LOCAL DATA ENGINEER: Database-backed FX rate provider with in-memory cache
 *
 * Replaces StubFxRateProvider with SQLite-backed rate storage
 * Maintains synchronous interface for compatibility with DisplayCurrencyAdapter
 */

import type { FxRateProvider } from "@modules/settlements/service/DisplayCurrencyAdapter";
import { FxRateRepository } from "../repository";
import type { FxRateSource } from "@db/schema/fx-rates";
import { fxLogger } from "@utils/logger";

/**
 * Cached FX Rate Provider
 *
 * Design:
 * - Maintains in-memory cache for synchronous access
 * - Loads rates from SQLite on initialization
 * - Provides async methods for updating rates
 * - Compatible with existing FxRateProvider interface
 *
 * Usage:
 * ```typescript
 * const provider = new CachedFxRateProvider();
 * await provider.initialize(); // Load rates from DB
 *
 * // Synchronous access (required by DisplayCurrencyAdapter)
 * const rate = provider.getRate('USD', 'EUR'); // throws if not found
 *
 * // Async updates
 * await provider.setManualRate('USD', 'EUR', 0.92);
 * await provider.refreshCache(); // Reload from DB
 * ```
 */
export class CachedFxRateProvider implements FxRateProvider {
  private cache: Map<
    string,
    { rate: number; fetchedAt: string; source: FxRateSource }
  > = new Map();
  private initialized = false;

  /**
   * Initialize provider by loading rates from database
   * Call this once at app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      fxLogger.warn("CachedFxRateProvider already initialized");
      return;
    }

    fxLogger.debug("Initializing CachedFxRateProvider");

    try {
      // Load all active rates from database
      const allRates = await FxRateRepository.getAllActiveRates();

      // Populate cache
      this.cache.clear();
      for (const rate of allRates) {
        const key = this.makeKey(rate.baseCurrency, rate.quoteCurrency);
        this.cache.set(key, {
          rate: rate.rate,
          fetchedAt: rate.fetchedAt,
          source: rate.source,
        });
      }

      this.initialized = true;
      fxLogger.info("CachedFxRateProvider initialized", {
        cachedRates: this.cache.size,
      });
    } catch (error) {
      fxLogger.error("Failed to initialize CachedFxRateProvider", error);
      // Initialize as empty cache rather than failing
      this.cache.clear();
      this.initialized = true;
      fxLogger.warn("Initialized with empty cache due to error");
    }
  }

  /**
   * Create cache key from currency pair
   */
  private makeKey(baseCurrency: string, quoteCurrency: string): string {
    return `${baseCurrency}-${quoteCurrency}`;
  }

  /**
   * Get exchange rate (synchronous)
   * Required by FxRateProvider interface
   *
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns Exchange rate (throws if not found)
   */
  getRate(fromCurrency: string, toCurrency: string): number {
    if (!this.initialized) {
      const error = new Error(
        "CachedFxRateProvider not initialized. Call initialize() at app startup.",
      ) as Error & { code: string };
      error.code = "FX_CACHE_NOT_INITIALIZED";
      fxLogger.error("FX rate cache not initialized", {
        fromCurrency,
        toCurrency,
        code: error.code,
      });
      throw error;
    }

    // Same currency = 1.0
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    const key = this.makeKey(fromCurrency, toCurrency);
    const cached = this.cache.get(key);

    if (!cached) {
      const error = new Error(
        `No exchange rate available for ${fromCurrency} to ${toCurrency}. Please update rates or set a manual rate.`,
      ) as Error & { code: string; fromCurrency: string; toCurrency: string };
      error.code = "FX_RATE_NOT_FOUND";
      error.fromCurrency = fromCurrency;
      error.toCurrency = toCurrency;

      fxLogger.error("FX rate not found in cache", {
        fromCurrency,
        toCurrency,
        code: error.code,
      });
      throw error;
    }

    fxLogger.debug("FX rate retrieved from cache", {
      fromCurrency,
      toCurrency,
      rate: cached.rate,
      source: cached.source,
    });
    return cached.rate;
  }

  /**
   * Check if a rate exists in the cache (non-throwing)
   * Useful for UI to check if conversion is available
   *
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns true if rate exists
   */
  hasRate(fromCurrency: string, toCurrency: string): boolean {
    if (fromCurrency === toCurrency) {
      return true;
    }
    const key = this.makeKey(fromCurrency, toCurrency);
    return this.cache.has(key);
  }

  /**
   * Load a specific rate from database into cache
   * Call this after updating rates in the repository
   *
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   */
  async loadRate(fromCurrency: string, toCurrency: string): Promise<void> {
    const rate = await FxRateRepository.getRate(fromCurrency, toCurrency);

    if (rate) {
      const key = this.makeKey(fromCurrency, toCurrency);
      this.cache.set(key, {
        rate: rate.rate,
        fetchedAt: rate.fetchedAt,
        source: rate.source,
      });
      fxLogger.debug("Rate loaded into cache", {
        fromCurrency,
        toCurrency,
        rate: rate.rate,
      });
    }
  }

  /**
   * Set a manual rate and persist to database
   *
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @param rate - Exchange rate
   */
  async setManualRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
  ): Promise<void> {
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      const error = new Error(
        "Manual FX rate must be a positive finite number",
      ) as Error & { code: string };
      error.code = "INVALID_FX_RATE";
      fxLogger.error("Invalid manual FX rate", {
        fromCurrency,
        toCurrency,
        rate,
        code: error.code,
      });
      throw error;
    }

    fxLogger.debug("Setting manual FX rate", {
      fromCurrency,
      toCurrency,
      rate,
    });

    await FxRateRepository.setRate({
      baseCurrency: fromCurrency,
      quoteCurrency: toCurrency,
      rate,
      source: "manual",
    });

    // Update cache immediately
    const key = this.makeKey(fromCurrency, toCurrency);
    this.cache.set(key, {
      rate,
      fetchedAt: new Date().toISOString(),
      source: "manual",
    });

    fxLogger.info("Manual FX rate set", { fromCurrency, toCurrency, rate });
  }

  /**
   * Refresh all cached rates from database
   * Call after batch updates from API
   */
  async refreshCache(): Promise<void> {
    fxLogger.debug("Refreshing FX rate cache");

    try {
      // Reload all active rates
      const allRates = await FxRateRepository.getAllActiveRates();

      // Clear and repopulate cache
      this.cache.clear();
      for (const rate of allRates) {
        const key = this.makeKey(rate.baseCurrency, rate.quoteCurrency);
        this.cache.set(key, {
          rate: rate.rate,
          fetchedAt: rate.fetchedAt,
          source: rate.source,
        });
      }

      fxLogger.info("FX rate cache refreshed", {
        cachedRates: this.cache.size,
      });
    } catch (error) {
      fxLogger.error("Failed to refresh FX rate cache", error);
      throw error;
    }
  }

  /**
   * Get last updated timestamp for a specific rate
   *
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns ISO timestamp or null if not found
   */
  getLastUpdated(fromCurrency: string, toCurrency: string): string | null {
    if (fromCurrency === toCurrency) {
      return new Date().toISOString();
    }

    const key = this.makeKey(fromCurrency, toCurrency);
    return this.cache.get(key)?.fetchedAt ?? null;
  }

  /**
   * Get source for a specific rate
   *
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns Source identifier or null if not found
   */
  getSource(fromCurrency: string, toCurrency: string): FxRateSource | null {
    if (fromCurrency === toCurrency) {
      return "manual";
    }

    const key = this.makeKey(fromCurrency, toCurrency);
    return this.cache.get(key)?.source ?? null;
  }

  /**
   * Check if provider has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get cache size (for debugging)
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Clear the cache (for testing)
   */
  clearCache(): void {
    fxLogger.debug("Clearing FX rate cache");
    this.cache.clear();
  }
}

/**
 * Singleton instance for app-wide use
 * Initialize at app startup via useDbMigrations or similar hook
 */
export const cachedFxRateProvider = new CachedFxRateProvider();
