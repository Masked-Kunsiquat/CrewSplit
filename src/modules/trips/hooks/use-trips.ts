/**
 * LOCAL DATA ENGINEER: Trips Data Hooks
 * React hooks for accessing trip data with proper state management
 */

import { useQuery } from "../../../hooks";
import { getTrips, getTripById } from "../repository";
/**
 * Hook to fetch all trips
 * @returns Object with trips array, loading state, error, and refetch function
 */
export function useTrips() {
  const {
    data: trips,
    loading,
    error,
    refetch,
  } = useQuery(
    getTrips,
    [],
    [],
    "Failed to load trips",
    true, // Refetch when navigating back to trips list
  );

  return { trips, loading, error, refetch };
}

/**
 * Hook to fetch a single trip by ID
 * @param tripId - Trip UUID (nullable - returns null data when not provided)
 * @returns Object with trip, loading state, error, and refetch function
 */
export function useTripById(tripId: string | null) {
  const {
    data: trip,
    loading,
    error,
    refetch,
  } = useQuery(
    () => (tripId ? getTripById(tripId) : Promise.resolve(null)),
    [tripId],
    null,
    "Failed to load trip",
  );

  return { trip, loading, error, refetch };
}
