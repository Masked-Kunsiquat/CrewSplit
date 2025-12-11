/**
 * LOCAL DATA ENGINEER: Trips Data Hooks
 * React hooks for accessing trip data with proper state management
 */

import { useEffect, useState } from 'react';
import { getTrips, getTripById } from '../repository';
import type { Trip } from '../types';

/**
 * Hook to fetch all trips
 * @returns Object with trips array, loading state, and error
 */
export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTrips() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTrips();
        if (mounted) {
          setTrips(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load trips'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadTrips();

    return () => {
      mounted = false;
    };
  }, []);

  return { trips, loading, error };
}

/**
 * Hook to fetch a single trip by ID
 * @param tripId - Trip UUID
 * @returns Object with trip, loading state, and error
 */
export function useTripById(tripId: string | null) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tripId) {
      setTrip(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadTrip() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTripById(tripId);
        if (mounted) {
          setTrip(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load trip'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadTrip();

    return () => {
      mounted = false;
    };
  }, [tripId]);

  return { trip, loading, error };
}
