/**
 * LOCAL DATA ENGINEER: Participants Data Hooks
 * React hooks for accessing participant data with proper state management
 */

import { useEffect, useState } from 'react';
import { getParticipantsForTrip } from '../repository';
import type { Participant } from '../types';

/**
 * Hook to fetch all participants for a trip
 * @param tripId - Trip UUID
 * @returns Object with participants array, loading state, and error
 */
export function useParticipants(tripId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadParticipants() {
      try {
        setLoading(true);
        setError(null);
        const data = await getParticipantsForTrip(tripId);
        if (mounted) {
          setParticipants(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load participants'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadParticipants();

    return () => {
      mounted = false;
    };
  }, [tripId]);

  return { participants, loading, error };
}
