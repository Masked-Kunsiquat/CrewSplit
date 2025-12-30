/**
 * HISTORY MODULE - useFormattedHistory Hook
 * UI INTEGRATION: Transforms Automerge operations into UI-friendly format
 *
 * This hook combines useTripHistory with formatChanges to provide
 * fully formatted change events ready for display in the UI.
 */

import { useMemo } from "react";
import { useTripHistory } from "../../automerge/hooks/use-trip-history";
import { useParticipants } from "../../participants/hooks/use-participants";
import { formatChanges } from "../engine/format-changes";
import type { FormattedChange } from "../types";

/**
 * Hook result
 */
export interface UseFormattedHistoryResult {
  /** Formatted changes ready for UI display */
  changes: FormattedChange[];
  /** Loading state (combines history + participants loading) */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
}

/**
 * Hook to get formatted history changes for a trip
 *
 * This hook:
 * 1. Loads trip history from Automerge (useTripHistory)
 * 2. Loads participants for name lookup (useParticipants)
 * 3. Formats changes into human-readable events (formatChanges)
 * 4. Returns formatted changes ready for timeline display
 *
 * @param tripId - Trip UUID
 * @returns Formatted changes with loading/error state
 *
 * @example
 * function TripHistoryScreen({ tripId }) {
 *   const { changes, loading, error } = useFormattedHistory(tripId);
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorView error={error} />;
 *
 *   return (
 *     <HistoryTimeline changes={changes} />
 *   );
 * }
 */
export function useFormattedHistory(tripId: string): UseFormattedHistoryResult {
  // Load raw history from Automerge
  const {
    changes: rawChanges,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useTripHistory(tripId);

  // Load participants for name lookup
  const {
    participants,
    loading: participantsLoading,
    refetch: refetchParticipants,
  } = useParticipants(tripId);

  // Create participant map for efficient lookup
  const participantMap = useMemo(() => {
    const map = new Map();
    participants.forEach((p) => {
      map.set(p.id, p);
    });
    return map;
  }, [participants]);

  // Format changes for UI display
  const formattedChanges = useMemo(() => {
    if (historyLoading || participantsLoading) {
      return [];
    }

    return formatChanges(rawChanges, participantMap);
  }, [rawChanges, participantMap, historyLoading, participantsLoading]);

  // Combined refetch
  const refetch = async () => {
    await Promise.all([refetchHistory(), refetchParticipants()]);
  };

  return {
    changes: formattedChanges,
    loading: historyLoading || participantsLoading,
    error: historyError,
    refetch,
  };
}
