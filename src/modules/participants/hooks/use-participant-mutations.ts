/**
 * LOCAL DATA ENGINEER: Participant Mutation Hooks
 * React hooks for creating/updating/deleting participants
 */

import { useState, useCallback } from "react";
import {
  createParticipant,
  updateParticipant,
  deleteParticipant,
} from "../repository";
import type {
  Participant,
  CreateParticipantInput,
  UpdateParticipantInput,
} from "../types";
import { participantLogger } from "@utils/logger";
import { createAppError } from "@utils/errors";

/**
 * Hook for adding a new participant
 */
export function useAddParticipant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const add = useCallback(
    async (participant: CreateParticipantInput): Promise<Participant> => {
      try {
        setLoading(true);
        setError(null);
        const newParticipant = await createParticipant(participant);
        return newParticipant;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : createAppError("OPERATION_FAILED", "Failed to add participant");
        participantLogger.error("Failed to create participant", error);
        setError(error);
        throw error; // Re-throw so caller can handle
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { add, loading, error };
}

/**
 * Hook for updating a participant
 */
export function useUpdateParticipant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (
      id: string,
      updates: UpdateParticipantInput,
    ): Promise<Participant> => {
      try {
        setLoading(true);
        setError(null);
        const updated = await updateParticipant(id, updates);
        return updated;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : createAppError(
                "OPERATION_FAILED",
                "Failed to update participant",
              );
        participantLogger.error("Failed to update participant", error);
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
 * Hook for removing a participant
 * IMPORTANT: Will fail if participant has expenses
 */
export function useRemoveParticipant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await deleteParticipant(id);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : createAppError("OPERATION_FAILED", "Failed to remove participant");
      participantLogger.error("Failed to delete participant", error);
      setError(error);
      throw error; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  }, []);

  return { remove, loading, error };
}
