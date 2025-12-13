/**
 * SETTLEMENT INTEGRATION ENGINEER: Settlement Data Hook
 * React hook for accessing settlement data with state management
 */

import { useQuery } from '../../../hooks';
import { computeSettlement } from '../service/SettlementService';
import type { SettlementSummary } from '../types';

/**
 * Hook to fetch settlement summary for a trip
 * @param tripId - Trip UUID (nullable - returns empty state when not provided)
 * @returns Object with settlement summary, loading state, and error
 */
export function useSettlement(tripId: string | null) {
  const emptySettlement: SettlementSummary = {
    balances: [],
    settlements: [],
    totalExpenses: 0,
    currency: 'USD',
  };

  const { data: settlement, loading, error, refetch } = useQuery(
    () => (tripId ? computeSettlement(tripId) : Promise.resolve(emptySettlement)),
    [tripId],
    emptySettlement,
    'Failed to load settlement data'
  );

  return { settlement, loading, error, refetch };
}
