/**
 * LOCAL DATA ENGINEER: Trip Mutation Hooks
 * React hooks for creating/updating/deleting trips
 *
 * These hooks use the TripService layer for orchestration and validation.
 */

import { useState, useCallback } from "react";
import * as TripService from "../service/TripService";
import { TripRepository } from "../repository";
import { ParticipantRepository } from "@modules/participants";
import type { Trip, CreateTripInput, UpdateTripInput } from "../types";
import type { CreateTripWithOwnerInput } from "../service/TripService";
import { tripLogger } from "@utils/logger";
import { createAppError } from "@utils/errors";

/**
 * Hook for creating a new trip (basic, without owner participant).
 * For most use cases, use useCreateTripWithOwner instead.
 */
export function useCreateTrip() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (trip: CreateTripInput): Promise<Trip> => {
    try {
      setLoading(true);
      setError(null);
      const newTrip = await TripRepository.createTrip(trip);
      return newTrip;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : createAppError("OPERATION_FAILED", "Failed to create trip");
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
 * Hook for creating a new trip with device owner as first participant.
 * This is the recommended way to create trips in the app.
 */
export function useCreateTripWithOwner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (
      trip: CreateTripWithOwnerInput,
    ): Promise<{ trip: Trip; participantId: string }> => {
      try {
        setLoading(true);
        setError(null);
        const result = await TripService.createTripWithOwner(trip, {
          tripRepository: TripRepository,
          participantRepository: ParticipantRepository,
        });
        return result;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : createAppError(
                "OPERATION_FAILED",
                "Failed to create trip with owner",
              );
        tripLogger.error("Failed to create trip with owner", error);
        setError(error);
        throw error; // Re-throw so caller can handle
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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
        const updated = await TripService.updateTrip(id, updates, {
          tripRepository: TripRepository,
        });
        return updated;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : createAppError("OPERATION_FAILED", "Failed to update trip");
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
 * Hook for deleting a trip with all related data (cascades).
 * Deletes participants, expenses, settlements, categories, and fx rates.
 */
export function useDeleteTrip() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await TripService.deleteTripWithCascades(id, {
        tripRepository: TripRepository,
      });
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : createAppError("OPERATION_FAILED", "Failed to delete trip");
      tripLogger.error("Failed to delete trip", error);
      setError(error);
      throw error; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error };
}

/**
 * Hook for bulk deleting multiple trips in a transaction.
 * Useful for clearing sample data or batch operations.
 */
export function useBulkDeleteTrips() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const removeBulk = useCallback(async (ids: string[]): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await TripService.deleteBulkTrips(ids, {
        tripRepository: TripRepository,
      });
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : createAppError("OPERATION_FAILED", "Failed to bulk delete trips");
      tripLogger.error("Failed to bulk delete trips", error);
      setError(error);
      throw error; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, []);

  return { removeBulk, loading, error };
}
