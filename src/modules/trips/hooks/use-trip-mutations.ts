/**
 * LOCAL DATA ENGINEER: Trip Mutation Hooks
 * React hooks for creating/updating/deleting trips
 */

import { useState, useCallback } from "react";
import { createTrip, updateTrip, deleteTrip } from "../repository";
import type { Trip, CreateTripInput, UpdateTripInput } from "../types";
import { tripLogger } from "@utils/logger";

/**
 * Hook for creating a new trip
 */
export function useCreateTrip() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (trip: CreateTripInput): Promise<Trip> => {
    try {
      setLoading(true);
      setError(null);
      const newTrip = await createTrip(trip);
      return newTrip;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to create trip");
      tripLogger.error("Failed to create trip", error);
      setError(error);
      throw error; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

/**
 * Hook for updating a trip
 */
export function useUpdateTrip() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (id: string, updates: UpdateTripInput): Promise<Trip> => {
      try {
        setLoading(true);
        setError(null);
        const updated = await updateTrip(id, updates);
        return updated;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to update trip");
        tripLogger.error("Failed to update trip", error);
        setError(error);
        throw error; // Re-throw so caller can handle
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { update, loading, error };
}

/**
 * Hook for deleting a trip
 */
export function useDeleteTrip() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await deleteTrip(id);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to delete trip");
      tripLogger.error("Failed to delete trip", error);
      setError(error);
      throw error; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error };
}
