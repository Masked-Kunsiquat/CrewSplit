/**
 * PARTICIPANTS MODULE - React Hooks
 */

import { useCallback, useEffect, useState } from 'react';
import { CreateParticipantInput, Participant, UpdateParticipantInput } from './types';
import {
  createParticipant,
  deleteParticipant,
  getParticipantById,
  getParticipantsForTrip,
  updateParticipant,
} from './repository';

export const useParticipants = (tripId: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getParticipantsForTrip(tripId);
      setParticipants(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  return { participants, isLoading, error, refresh: load };
};

export const useParticipant = (id: string) => {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getParticipantById(id);
      setParticipant(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { participant, isLoading, error, refresh: load };
};

export const useCreateParticipant = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const create = useCallback(async (input: CreateParticipantInput) => {
    setIsSaving(true);
    setError(null);
    try {
      return await createParticipant(input);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { createParticipant: create, isSaving, error };
};

export const useUpdateParticipant = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const update = useCallback(async (id: string, patch: UpdateParticipantInput) => {
    setIsSaving(true);
    setError(null);
    try {
      return await updateParticipant(id, patch);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { updateParticipant: update, isSaving, error };
};

export const useDeleteParticipant = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const remove = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteParticipant(id);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteParticipant: remove, isDeleting, error };
};
