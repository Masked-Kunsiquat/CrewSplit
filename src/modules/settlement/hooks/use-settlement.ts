/**
 * SETTLEMENT HOOKS
 * Settlement Integration Engineer: React hooks for settlement data
 * No currency conversions or UI formatting - returns raw settlement data
 */

import { useQuery } from '../../../hooks';
import { computeSettlement } from '../service/SettlementService';
import type { SettlementSummary } from '../types';

/**
 * Hook to fetch settlement data for a trip
 *
 * Loads all expenses, splits, and participants for the trip,
 * then computes balances and optimized settlements.
 *
 * All amounts are in the trip's currency minor units (cents).
 * No currency conversions or UI formatting are performed.
 *
 * @param tripId - Trip UUID
 * @returns Settlement summary with balances, settlements, total expenses, and currency
 *
 * @example
 * ```tsx
 * function SettlementScreen({ tripId }: { tripId: string }) {
 *   const { settlement, loading, error } = useSettlement(tripId);
 *
 *   if (loading) return <Loading />;
 *   if (error) return <Error message={error} />;
 *   if (!settlement) return null;
 *
 *   return (
 *     <View>
 *       <Text>Total: {settlement.totalExpenses} cents in {settlement.currency}</Text>
 *       {settlement.settlements.map(s => (
 *         <Text key={`${s.from}-${s.to}`}>
 *           {s.fromName} pays {s.toName} {s.amount} cents
 *         </Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useSettlement(tripId: string) {
  const { data: settlement, loading, error } = useQuery(
    () => computeSettlement(tripId),
    [tripId],
    null,
    'Failed to compute settlement'
  );

  return { settlement, loading, error };
}
