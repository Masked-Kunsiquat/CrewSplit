/**
 * AUTOMERGE MODULE - useTripHistory Hook
 * UI INTEGRATION: React hook for accessing trip's Automerge operation log
 *
 * This hook loads a trip's Automerge document and extracts the change history
 * using Automerge.getHistory(). It returns parsed changes ready for display.
 */

import { useState, useEffect, useMemo } from "react";
import * as Automerge from "@automerge/automerge";
import { AutomergeManager } from "../service/AutomergeManager";
import { parseHistory } from "../engine/history-parser";
import type { ParsedChange } from "../engine/history-parser";
import type { TripAutomergeDoc } from "../types";
import { createAppError } from "@utils/errors";

/**
 * Hook result
 */
export interface UseTripHistoryResult {
  /** Parsed changes from Automerge history */
  changes: ParsedChange[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => Promise<void>;
}

/**
 * Hook to load and query a trip's Automerge operation log
 *
 * This hook:
 * 1. Loads the trip's Automerge document
 * 2. Calls Automerge.getHistory() to get all changes
 * 3. Parses changes into structured events
 * 4. Returns parsed changes sorted newest-first
 *
 * @param tripId - Trip UUID
 * @returns Hook result with changes, loading state, and error
 *
 * @example
 * function HistoryScreen({ tripId }) {
 *   const { changes, loading, error } = useTripHistory(tripId);
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorView error={error} />;
 *
 *   return <HistoryTimeline changes={changes} />;
 * }
 */
export function useTripHistory(tripId: string): UseTripHistoryResult {
  const [changes, setChanges] = useState<ParsedChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create manager instance (memoized)
  const manager = useMemo(() => new AutomergeManager(), []);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        setLoading(true);
        setError(null);

        // Load Automerge document
        const doc = await manager.loadTrip(tripId);

        if (!doc) {
          throw createAppError("DOC_NOT_FOUND", "Trip document not found", {
            details: { tripId },
          });
        }

        // Get history from Automerge
        const history = Automerge.getHistory(doc) as {
          change: Automerge.DecodedChange;
          snapshot: TripAutomergeDoc;
        }[];

        // Parse history into structured changes
        const parsedChanges = parseHistory(history);

        if (isMounted) {
          setChanges(parsedChanges);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err : new Error("Failed to load history"),
          );
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [tripId, manager, refreshKey]);

  const refetch = async () => {
    setRefreshKey((prev) => prev + 1);
  };

  return {
    changes,
    loading,
    error,
    refetch,
  };
}
