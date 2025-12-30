/**
 * AUTOMERGE MODULE - React Hook
 * UI INTEGRATION: React hook for loading Automerge documents
 * HOOK LAYER: Bridges service to React components
 *
 * Provides a React hook for loading and working with Automerge documents.
 * Manages loading state and errors.
 */

import { useState, useEffect } from "react";
import * as Automerge from "@automerge/automerge";
import { AutomergeManager } from "../service/AutomergeManager";
import type { TripAutomergeDoc } from "../types";

/**
 * Module-level singleton AutomergeManager
 * Shared across all hook instances to avoid per-render allocations
 */
const defaultManager = new AutomergeManager();

/**
 * Result of the useAutomergeDoc hook
 */
export interface UseAutomergeDocResult {
  doc: Automerge.Doc<TripAutomergeDoc> | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * Hook for loading a trip's Automerge document
 *
 * Automatically loads the document when the tripId changes.
 * Provides loading state and error handling.
 *
 * @param tripId - Trip UUID to load
 * @param manager - Optional AutomergeManager instance (for testing)
 * @returns Document, loading state, error, and reload function
 *
 * @example
 * function MyComponent({ tripId }: { tripId: string }) {
 *   const { doc, loading, error, reload } = useAutomergeDoc(tripId);
 *
 *   if (loading) return <Text>Loading...</Text>;
 *   if (error) return <Text>Error: {error.message}</Text>;
 *   if (!doc) return <Text>No document found</Text>;
 *
 *   return <Text>{doc.name}</Text>;
 * }
 */
export function useAutomergeDoc(
  tripId: string | null,
  manager: AutomergeManager = defaultManager,
): UseAutomergeDocResult {
  const [doc, setDoc] = useState<Automerge.Doc<TripAutomergeDoc> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadDoc = async () => {
    if (!tripId) {
      setDoc(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const loadedDoc = await manager.loadTrip(tripId);
      setDoc(loadedDoc);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setDoc(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoc();
    // Manager is intentionally omitted: it's a stable singleton instance whose identity
    // does not change across renders and does not affect loadDoc behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  return {
    doc,
    loading,
    error,
    reload: loadDoc,
  };
}
