/**
 * DISPLAY INTEGRATION ENGINEER: Settlement with Display Currency Hook
 * Extends useSettlement to optionally include display currency conversions
 */

import { useMemo, useState } from "react";
import { useSettlement } from "./use-settlement";
import { defaultDisplayCurrencyAdapter } from "../service/DisplayCurrencyAdapter";
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
  const [conversionError, setConversionError] =
    useState<NoRateAvailableError | null>(null);

  // Convert to display currency if requested
  const settlementWithDisplay = useMemo<SettlementSummaryWithDisplay>(() => {
    // Clear previous conversion error
    setConversionError(null);

    try {
      return defaultDisplayCurrencyAdapter.enrichSettlement(
        settlement,
        displayCurrency,
      );
    } catch (error) {
      // Check if it's a missing rate error
      if (isNoRateAvailableError(error)) {
        // Expose to UI for recovery flow
        setConversionError(error);
        console.warn(
          `Missing FX rate for ${error.fromCurrency} → ${error.toCurrency}`,
          error,
        );
      } else {
        // Log other conversion errors
        console.warn(
          `Failed to convert settlement to display currency ${displayCurrency}:`,
          error,
        );
      }

      // Return settlement without display conversion
      return {
        ...settlement,
        displayCurrency: undefined,
        displayTotalExpenses: undefined,
      };
    }
  }, [settlement, displayCurrency]);

  return {
    settlement: settlementWithDisplay,
    loading,
    error,
    conversionError,
    refetch,
  };
}
