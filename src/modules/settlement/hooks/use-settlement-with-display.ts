/**
 * DISPLAY INTEGRATION ENGINEER: Settlement with Display Currency Hook
 * Extends useSettlement to optionally include display currency conversions
 */

import { useMemo } from 'react';
import { useSettlement } from './use-settlement';
import { defaultDisplayCurrencyAdapter } from '../service/DisplayCurrencyAdapter';
import type { SettlementSummaryWithDisplay } from '../types';

/**
 * Hook to fetch settlement summary with optional display currency conversion
 * @param tripId - Trip UUID
 * @param displayCurrency - Optional display currency code (e.g., 'EUR', 'GBP')
 * @returns Object with settlement summary (with display data), loading state, and error
 */
export function useSettlementWithDisplay(
  tripId: string,
  displayCurrency?: string
) {
  const { settlement, loading, error, refetch } = useSettlement(tripId);

  // Convert to display currency if requested
  const settlementWithDisplay = useMemo<SettlementSummaryWithDisplay>(() => {
    try {
      return defaultDisplayCurrencyAdapter.enrichSettlement(
        settlement,
        displayCurrency
      );
    } catch (conversionError) {
      // If conversion fails, log and return original settlement
      console.warn(
        `Failed to convert settlement to display currency ${displayCurrency}:`,
        conversionError
      );
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
    refetch,
  };
}
