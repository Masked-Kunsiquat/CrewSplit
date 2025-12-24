/**
 * STATISTICS INTEGRATION ENGINEER: Statistics Data Hook
 * React hook for accessing trip statistics with state management
 */

import { useCallback, useMemo } from "react";
import { useQuery } from "../../../hooks";
import { StatisticsService } from "../service/StatisticsService";
import type { TripStatistics } from "../types";

/**
 * Hook to fetch statistics for a trip
 * @param tripId - Trip UUID (nullable - returns empty state when not provided)
 * @returns Object with statistics, loading state, and error
 */
export function useStatistics(tripId: string | null) {
  const emptyStatistics = useMemo<TripStatistics>(
    () => ({
      totalCost: 0,
      currency: "USD",
      participantSpending: [],
      categorySpending: [],
      timestamp: new Date().toISOString(),
    }),
    [],
  );

  const queryFn = useCallback(
    () =>
      tripId
        ? StatisticsService.computeStatistics(tripId)
        : Promise.resolve(emptyStatistics),
    [tripId, emptyStatistics],
  );

  const {
    data: statistics,
    loading,
    error,
    refetch,
  } = useQuery(
    queryFn,
    [tripId],
    emptyStatistics,
    "Failed to load trip statistics",
  );

  return useMemo(
    () => ({
      statistics,
      isLoading: loading,
      error,
      refetch,
    }),
    [statistics, loading, error, refetch],
  );
}
