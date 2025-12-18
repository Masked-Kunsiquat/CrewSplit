/**
 * USE FX SYNC HOOK
 * UI integration for automatic FX rate staleness checking and background refresh
 *
 * Responsibilities:
 * - Check staleness on mount (>7 days old)
 * - Trigger automatic refresh if stale AND online
 * - Expose manual refresh function
 * - Show toast notifications for success/failure
 * - Return loading/error states
 */

import { useState, useEffect, useCallback } from "react";
import { FxRateRepository } from "../repository";
import { FxRateService } from "../services";
import { cachedFxRateProvider } from "../provider";
import { fxLogger } from "@utils/logger";

// Dynamic import to avoid type-checking issues
let NetInfo: typeof import("@react-native-community/netinfo").default | null =
  null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NetInfo = require("@react-native-community/netinfo").default;
} catch {
  // NetInfo not available - network checks will be skipped
  fxLogger.warn("NetInfo not available - network checks will be skipped");
}

interface UseFxSyncOptions {
  /**
   * Enable automatic background refresh when rates are stale
   * Default: true
   */
  autoRefresh?: boolean;

  /**
   * Callback when rates are successfully refreshed
   */
  onRefreshSuccess?: (count: number) => void;

  /**
   * Callback when refresh fails
   */
  onRefreshError?: (error: Error) => void;
}

/**
 * Hook for automatic FX rate staleness checking and background sync
 *
 * Strategy:
 * 1. Check staleness on mount
 * 2. If stale AND online AND autoRefresh enabled: trigger background refresh
 * 3. Provide manual refresh function for user-initiated updates
 * 4. Don't block app startup - run in background
 *
 * Usage:
 * ```tsx
 * // In app/_layout.tsx (after migrations)
 * useFxSync({
 *   autoRefresh: true,
 *   onRefreshSuccess: (count) => console.log(`Updated ${count} rates`),
 * });
 *
 * // In settings screen (manual refresh)
 * const { refreshNow, refreshing } = useFxSync({ autoRefresh: false });
 * <Button onPress={refreshNow} loading={refreshing}>Refresh Rates</Button>
 * ```
 */
export function useFxSync(options: UseFxSyncOptions = {}) {
  const { autoRefresh = true, onRefreshSuccess, onRefreshError } = options;

  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [daysOld, setDaysOld] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  /**
   * Check if rates are stale (>7 days old)
   */
  const checkStaleness = useCallback(async () => {
    try {
      setChecking(true);
      fxLogger.debug("Checking FX rate staleness");

      const staleness = await FxRateRepository.getStalenessInfo();

      setIsStale(staleness.staleRates > 0);
      setLastChecked(new Date());

      // Calculate days old
      if (staleness.oldestFetchedAt) {
        const oldest = new Date(staleness.oldestFetchedAt);
        const now = new Date();
        const diffMs = now.getTime() - oldest.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        setDaysOld(days);

        fxLogger.debug("FX staleness check result", {
          isStale: staleness.staleRates > 0,
          daysOld: days,
          totalRates: staleness.totalRates,
          staleRates: staleness.staleRates,
        });
      } else {
        setDaysOld(null);
        fxLogger.debug("No FX rates found in database");
      }

      return staleness.staleRates > 0;
    } catch (error) {
      fxLogger.error("Failed to check FX rate staleness", error);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  /**
   * Refresh rates from online API
   */
  const refreshNow = useCallback(async () => {
    setRefreshing(true);

    try {
      fxLogger.info("Manual FX rate refresh triggered");

      // Fetch and persist rates
      const result = await FxRateService.updateCommonRates();

      // Refresh provider cache
      await cachedFxRateProvider.refreshCache();

      // Re-check staleness
      await checkStaleness();

      fxLogger.info("FX rates refreshed successfully", {
        source: result.source,
        count: result.persistedCount,
      });

      onRefreshSuccess?.(result.persistedCount);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      fxLogger.error("Failed to refresh FX rates", err);
      onRefreshError?.(err);
      throw error; // Re-throw so caller can handle
    } finally {
      setRefreshing(false);
    }
  }, [checkStaleness, onRefreshSuccess, onRefreshError]);

  /**
   * Perform background refresh if rates are stale and network is available
   */
  const performBackgroundRefresh = useCallback(async () => {
    try {
      // Check network connectivity if available
      if (NetInfo) {
        const netState = await NetInfo.fetch();

        if (!netState.isConnected || !netState.isInternetReachable) {
          fxLogger.info(
            "Skipping background FX refresh - no internet connection",
          );
          return;
        }
      } else {
        // If NetInfo unavailable, assume connected and try anyway
        fxLogger.debug(
          "NetInfo unavailable - attempting background refresh anyway",
        );
      }

      fxLogger.info(
        "Starting background FX rate refresh (stale rates detected)",
      );

      // Refresh in background (don't throw on error)
      try {
        await refreshNow();
      } catch (error) {
        fxLogger.warn("Background FX refresh failed (non-fatal)", error);
        // Don't throw - this is background operation
      }
    } catch (error) {
      fxLogger.error("Failed to check network for background refresh", error);
    }
  }, [refreshNow]);

  /**
   * Initial staleness check on mount
   */
  useEffect(() => {
    const performInitialCheck = async () => {
      const stale = await checkStaleness();

      // If stale and auto-refresh enabled, trigger background refresh
      if (stale && autoRefresh) {
        fxLogger.info("FX rates are stale - scheduling background refresh");
        // Use setTimeout to avoid blocking mount
        setTimeout(() => {
          performBackgroundRefresh();
        }, 1000);
      }
    };

    performInitialCheck();
  }, [autoRefresh, checkStaleness, performBackgroundRefresh]);

  return {
    /**
     * True if currently checking staleness
     */
    checking,

    /**
     * True if currently refreshing from API
     */
    refreshing,

    /**
     * True if any rates are stale (>7 days old)
     */
    isStale,

    /**
     * Number of days since oldest rate was fetched (null if no rates)
     */
    daysOld,

    /**
     * When staleness was last checked
     */
    lastChecked,

    /**
     * Manually trigger refresh (returns promise)
     */
    refreshNow,

    /**
     * Re-check staleness without refreshing
     */
    checkStaleness,
  };
}
