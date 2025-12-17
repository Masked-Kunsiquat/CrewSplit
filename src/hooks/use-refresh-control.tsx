/**
 * UI/UX ENGINEER: Pull-to-Refresh Hook
 * Provides RefreshControl component for ScrollView with multi-source refetch support
 */

import { useState, useCallback, useMemo } from "react";
import { RefreshControl } from "react-native";
import { theme } from "@ui/theme";

/**
 * Hook to create a RefreshControl component for pull-to-refresh functionality
 *
 * Handles multiple data sources by calling all refetch functions in parallel.
 * Manages refreshing state automatically.
 *
 * @param refetchFunctions - Array of refetch functions from useQuery-based hooks.
 *   For optimal performance, memoize this array with useMemo if refetch references are stable.
 * @returns RefreshControl component ready to pass to ScrollView
 *
 * @example
 * ```typescript
 * // Single data source
 * const { trips, refetch } = useTrips();
 * const refreshControl = useRefreshControl([refetch]);
 *
 * <ScrollView refreshControl={refreshControl}>
 *   {trips.map(...)}
 * </ScrollView>
 * ```
 *
 * @example
 * ```typescript
 * // Multiple data sources
 * const { trip, refetch: refetchTrip } = useTripById(tripId);
 * const { participants, refetch: refetchParticipants } = useParticipants(tripId);
 * const { expenses, refetch: refetchExpenses } = useExpenses(tripId);
 * const refreshControl = useRefreshControl([
 *   refetchTrip,
 *   refetchParticipants,
 *   refetchExpenses,
 * ]);
 * ```
 */
export function useRefreshControl(
  refetchFunctions: Array<(() => void | Promise<void>) | undefined>,
) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      // Filter out undefined refetch functions and call all in parallel
      const validRefetchFns = refetchFunctions.filter(
        (fn): fn is () => void => fn !== undefined,
      );

      // Call all refetch functions simultaneously
      // Note: refetch() from useQuery is synchronous (triggers re-render via state)
      // but we wrap in Promise to ensure proper async handling
      await Promise.all(
        validRefetchFns.map(async (fn) => {
          const result = fn();
          if (
            result &&
            typeof (result as Promise<unknown>).then === "function"
          ) {
            await result;
          }
        }),
      );
    } catch (error) {
      // Refetch errors are already handled by individual hooks
      console.warn("Error during refresh:", error);
    } finally {
      // Ensure refreshing state is cleared even if errors occur
      setRefreshing(false);
    }
  }, [refetchFunctions]);

  // Memoize RefreshControl to prevent unnecessary re-renders
  return useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[theme.colors.primary]} // Android
        tintColor={theme.colors.primary} // iOS
      />
    ),
    [refreshing, onRefresh],
  );
}
