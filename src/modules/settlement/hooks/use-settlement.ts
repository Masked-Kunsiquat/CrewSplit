/**
 * SETTLEMENT INTEGRATION ENGINEER: Settlement Data Hook
 * React hook for accessing settlement data with state management
 */

import { useQuery } from '../../../hooks';
import { computeSettlement } from '../service/SettlementService';
import type { SettlementSummary } from '../types';

/**
 * Hook to fetch settlement summary for a trip
 * @param tripId - Trip UUID
 * @returns Object with settlement summary, loading state, and error
 */
export function useSettlement(tripId: string) {
  const { data: settlement, loading, error } = useQuery(
    () => computeSettlement(tripId),
    [tripId],
    {
      balances: [],
      settlements: [],
      totalExpenses: 0,
      currency: 'USD',
    } as SettlementSummary,
    'Failed to load settlement data'
  );

  return { settlement, loading, error };
}
