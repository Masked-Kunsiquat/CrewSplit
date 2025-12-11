/**
 * LOCAL DATA ENGINEER: Participants Data Hooks
 * React hooks for accessing participant data with proper state management
 */

import { useQuery } from '../../../hooks';
import { getParticipantsForTrip } from '../repository';
import type { Participant } from '../types';

/**
 * Hook to fetch all participants for a trip
 * @param tripId - Trip UUID
 * @returns Object with participants array, loading state, and error
 */
export function useParticipants(tripId: string) {
  const { data: participants, loading, error } = useQuery(
    () => getParticipantsForTrip(tripId),
    [tripId],
    [],
    'Failed to load participants'
  );

  return { participants, loading, error };
}
