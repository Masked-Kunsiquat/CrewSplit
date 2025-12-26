/**
 * LOCAL DATA ENGINEER: Generic Query Hook
 * Reusable pattern for data fetching with loading/error states
 */

import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { createAppError } from "@utils/errors";

/**
 * Generic hook for fetching data with consistent loading/error handling
 *
 * @param queryFn - Async function that fetches the data
 * @param deps - Dependency array for the effect
 * @param initialValue - Initial value for the data state
 * @param errorMessage - Custom error message prefix (optional)
 * @param enableFocusRefetch - Whether to refetch when screen comes into focus (default: false)
 * @returns Object with data, loading state, error, and refetch function
 *
 * @example
 * ```typescript
 * export function useTrips() {
 *   return useQuery(
 *     getTrips,
 *     [],
 *     [],
 *     'Failed to load trips',
 *     true // Enable refetch on focus
 *   );
 * }
 * ```
 */
export function useQuery<T>(
  queryFn: () => Promise<T>,
  deps: React.DependencyList,
  initialValue: T,
  errorMessage: string = "Failed to load data",
  enableFocusRefetch: boolean = false,
) {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await queryFn();
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err
              : createAppError("OPERATION_FAILED", errorMessage),
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshTrigger]);

  // Optionally refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (enableFocusRefetch) {
        refetch();
      }
    }, [refetch, enableFocusRefetch]),
  );

  return { data, loading, error, refetch };
}
