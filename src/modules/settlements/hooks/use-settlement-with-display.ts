/**
 * DISPLAY INTEGRATION ENGINEER: Settlement with Display Currency Hook
 * Extends useSettlement to optionally include display currency conversions
 */

import { useMemo, useState, useEffect } from "react";
import { useSettlement } from "./use-settlement";
import { DisplayCurrencyAdapter } from "../service/DisplayCurrencyAdapter";
import { useFxRateProvider } from "@modules/fx-rates";
import type { SettlementSummaryWithDisplay } from "../types";

/**
 * Error type for missing FX rate
 */
export interface NoRateAvailableError extends Error {
  code: "FX_RATE_NOT_FOUND";
  fromCurrency: string;
  toCurrency: string;
}

/**
 * Type guard for NoRateAvailableError
 */
function isNoRateAvailableError(error: unknown): error is NoRateAvailableError {
  return (
    error instanceof Error &&
    (error as { code?: string }).code === "FX_RATE_NOT_FOUND"
  );
}

/**
 * Hook to fetch settlement summary with optional display currency conversion
 * @param tripId - Trip UUID (nullable - returns empty state when not provided)
 * @param displayCurrency - Optional display currency code (e.g., 'EUR', 'GBP')
 * @returns Object with settlement summary (with display data), loading state, and error
 */
export function useSettlementWithDisplay(
  tripId: string | null,
  displayCurrency?: string,
) {
  const { settlement, loading, error, refetch } = useSettlement(tripId);
  const fxRateProvider = useFxRateProvider();
  const [conversionError, setConversionError] =
    useState<NoRateAvailableError | null>(null);

  // Create adapter instance with provider from context
  const adapter = useMemo(
    () => new DisplayCurrencyAdapter(fxRateProvider),
    [fxRateProvider],
  );

  // Convert to display currency if requested
  const result = useMemo<{
    settlement: SettlementSummaryWithDisplay;
    error: NoRateAvailableError | null;
  }>(() => {
    try {
      const enriched = adapter.enrichSettlement(settlement, displayCurrency);
      return { settlement: enriched, error: null };
    } catch (error) {
      // Check if it's a missing rate error
      if (isNoRateAvailableError(error)) {
        console.warn(
          `Missing FX rate for ${error.fromCurrency} → ${error.toCurrency}`,
          error,
        );
        return {
          settlement: {
            ...settlement,
            displayCurrency: undefined,
            displayTotalExpenses: undefined,
          },
          error,
        };
      } else {
        // Log other conversion errors
        console.warn(
          `Failed to convert settlement to display currency ${displayCurrency}:`,
          error,
        );
        return {
          settlement: {
            ...settlement,
            displayCurrency: undefined,
            displayTotalExpenses: undefined,
          },
          error: null,
        };
      }
    }
  }, [adapter, settlement, displayCurrency]);

  // Update error state in useEffect to avoid state updates during render
  useEffect(() => {
    setConversionError(result.error);
  }, [result.error]);

  return {
    settlement: result.settlement,
    loading,
    error,
    conversionError,
    refetch,
  };
}
