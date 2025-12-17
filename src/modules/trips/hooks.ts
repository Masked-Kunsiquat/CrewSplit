/**
 * TRIPS MODULE - React Hooks
 * Lightweight data-fetching hooks (no business logic)
 */

import { useCallback, useEffect, useState } from "react";
import {
  createTrip,
  getTripById,
  getTrips,
  updateTrip,
  deleteTrip,
} from "./repository";
import { CreateTripInput, Trip, UpdateTripInput } from "./types";

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTrips();
      setTrips(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  return { trips, isLoading, error, refresh: loadTrips };
};

export const useTrip = (id: string) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadTrip = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTripById(id);
      setTrip(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  return { trip, isLoading, error, refresh: loadTrip };
};

export const useCreateTrip = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const create = useCallback(async (input: CreateTripInput) => {
    setIsSaving(true);
    setError(null);
    try {
      return await createTrip(input);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { createTrip: create, isSaving, error };
};

export const useUpdateTrip = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const update = useCallback(async (id: string, patch: UpdateTripInput) => {
    setIsSaving(true);
    setError(null);
    try {
      return await updateTrip(id, patch);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { updateTrip: update, isSaving, error };
};

export const useDeleteTrip = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteTrip(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteTrip: remove, isDeleting, error };
};
