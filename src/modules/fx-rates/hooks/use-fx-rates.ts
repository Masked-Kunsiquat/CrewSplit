/**
 * USE FX RATES HOOK
 * UI integration for FX rate management
 */

import { useState, useCallback, useEffect } from "react";
import { FxRateRepository } from "../repository";
import { FxRateService } from "../services";
import { useFxRateProvider } from "../context/FxRateContext";
import type { StalenessInfo, FxRate } from "../types";
import { fxLogger } from "@utils/logger";

/**
 * Hook for managing FX rates in UI
 *
 * Provides:
 * - Current rate count and staleness info
 * - Refresh function to fetch latest rates
 * - Loading and error states
 *
 * Usage:
 * ```tsx
 * const { rates, staleness, refreshRates, loading, error } = useFxRates();
 *
 * <Button onPress={refreshRates} loading={loading}>
 *   Refresh Rates
 * </Button>
 * ```
 */
export function useFxRates() {
  const fxRateProvider = useFxRateProvider();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleness, setStaleness] = useState<StalenessInfo>({
    oldestFetchedAt: null,
    totalRates: 0,
    staleRates: 0,
    isStale: false,
  });

  /**
   * Load staleness info from database
   */
  const loadStalenessInfo = useCallback(async () => {
    try {
      const info = await FxRateRepository.getStalenessInfo();
      setStaleness({
        ...info,
        isStale: info.staleRates > 0,
      });
    } catch (err) {
      fxLogger.error("Failed to load staleness info", err);
    }
  }, []);

  /**
   * Refresh rates from API
   */
  const refreshRates = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      fxLogger.info("Refreshing FX rates from API");

      // Fetch and persist rates (service will refresh cache)
      const result = await FxRateService.updateCommonRates(fxRateProvider);

      // Reload staleness info
      await loadStalenessInfo();

      fxLogger.info("FX rates refreshed successfully", {
        source: result.source,
        count: result.persistedCount,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh rates";
      setError(errorMessage);
      fxLogger.error("Failed to refresh FX rates", err);
      throw err; // Re-throw so caller can handle
    } finally {
      setRefreshing(false);
    }
  }, [fxRateProvider, loadStalenessInfo]);

  /**
   * Initial load of staleness info
   */
  useEffect(() => {
    setLoading(true);
    loadStalenessInfo().finally(() => setLoading(false));
  }, [loadStalenessInfo]);

  return {
    /** Total number of active rates */
    rateCount: staleness.totalRates,
    /** Number of stale rates (>24 hours old) */
    staleRateCount: staleness.staleRates,
    /** Oldest fetchedAt timestamp */
    oldestUpdate: staleness.oldestFetchedAt,
    /** True if any rates are stale */
    isStale: staleness.isStale,
    /** Refresh rates from API */
    refreshRates,
    /** Initial loading state */
    loading,
    /** Refresh in progress */
    refreshing,
    /** Error message (null if no error) */
    error,
    /** Clear error */
    clearError: () => setError(null),
  };
}

/**
 * Hook for fetching all active FX rates
 * Used primarily for displaying rates in admin/debug screens
 */
export function useAllFxRates() {
  const [rates, setRates] = useState<FxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allRates = await FxRateRepository.getAllActiveRates();
      // Sort by most recently fetched first
      const sorted = allRates.sort(
        (a, b) =>
          new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime(),
      );
      setRates(sorted);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load rates";
      setError(errorMessage);
      fxLogger.error("Failed to load exchange rates", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  return {
    /** All active FX rates */
    rates,
    /** Loading state */
    loading,
    /** Error message (null if no error) */
    error,
    /** Refetch rates */
    refetch: loadRates,
  };
}
