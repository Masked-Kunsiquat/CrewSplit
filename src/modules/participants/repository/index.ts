/**
 * PARTICIPANT REPOSITORY
 * LOCAL DATA ENGINEER: Trip-scoped participant CRUD helpers
 * DUAL-WRITE: Writes to Automerge first, then rebuilds SQLite cache
 */

import * as Crypto from "expo-crypto";
import { db } from "@db/client";
import {
  participants as participantsTable,
  Participant as ParticipantRow,
} from "@db/schema/participants";
import { eq } from "drizzle-orm";
import {
  CreateParticipantInput,
  Participant,
  UpdateParticipantInput,
} from "../types";
import { participantLogger } from "@utils/logger";
import { createNotFoundError, createAppError } from "@utils/errors";
import { AutomergeManager } from "@modules/automerge/service/AutomergeManager";
import { rebuildTripCache } from "@modules/automerge/repository/sqlite-cache-builder";

/**
 * Transaction type from Drizzle ORM
 */
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Singleton AutomergeManager instance for dual-write operations
 */
const automergeManager = new AutomergeManager();

const mapParticipant = (row: ParticipantRow): Participant => ({
  id: row.id,
  tripId: row.tripId,
  name: row.name,
  avatarColor: row.avatarColor ?? undefined,
  createdAt: row.createdAt,
});

export const createParticipant = async (
  input: CreateParticipantInput,
  tx?: DbTransaction,
): Promise<Participant> => {
  const participantId = Crypto.randomUUID();

  participantLogger.debug("Creating participant (dual-write)", {
    participantId,
    tripId: input.tripId,
    name: input.name,
  });

  try {
    // Step 1: Add participant to Automerge document (source of truth)
    participantLogger.debug("Adding participant to Automerge", {
      participantId,
      tripId: input.tripId,
    });
    const doc = await automergeManager.addParticipant(input.tripId, {
      id: participantId,
      name: input.name,
      color: input.avatarColor ?? "#000000",
    });

    // Step 2: Rebuild SQLite cache from Automerge doc
    participantLogger.debug("Rebuilding SQLite cache", {
      tripId: input.tripId,
    });
    await rebuildTripCache(input.tripId, doc);

    // Step 3: Load and return from SQLite (cache layer)
    const participant = await getParticipantById(participantId);
    if (!participant) {
      throw createAppError(
        "CACHE_DESYNC",
        `Participant ${participantId} created in Automerge but missing from SQLite`,
        { details: { participantId, tripId: input.tripId } },
      );
    }

    participantLogger.info("Participant created (dual-write)", {
      participantId,
      tripId: input.tripId,
      name: input.name,
    });
    return participant;
  } catch (error) {
    participantLogger.error("Failed to create participant", {
      participantId,
      tripId: input.tripId,
      error,
    });
    throw error;
  }
};

export const getParticipantsForTrip = async (
  tripId: string,
): Promise<Participant[]> => {
  const rows = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.tripId, tripId));
  participantLogger.debug("Loaded participants for trip", {
    tripId,
    count: rows.length,
  });
  return rows.map(mapParticipant);
};

export const getParticipantById = async (
  id: string,
): Promise<Participant | null> => {
  const rows = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.id, id))
    .limit(1);
  if (!rows.length) {
    participantLogger.warn("Participant not found", { participantId: id });
    return null;
  }
  participantLogger.debug("Loaded participant", {
    participantId: id,
    name: rows[0].name,
  });
  return mapParticipant(rows[0]);
};

export const updateParticipant = async (
  id: string,
  patch: UpdateParticipantInput,
): Promise<Participant> => {
  participantLogger.debug("Updating participant (dual-write)", {
    participantId: id,
  });

  try {
    // First, load participant to get tripId for cache rebuild
    const existing = await getParticipantById(id);
    if (!existing) {
      participantLogger.error("Participant not found on update", {
        participantId: id,
      });
      throw createNotFoundError("PARTICIPANT_NOT_FOUND", "Participant", id);
    }

    // Build Automerge update payload
    const automergeUpdate: {
      name?: string;
      color?: string;
    } = {};

    if (patch.name !== undefined) automergeUpdate.name = patch.name;
    if (patch.avatarColor !== undefined)
      automergeUpdate.color = patch.avatarColor;

    // Step 1: Update participant in Automerge document (source of truth)
    participantLogger.debug("Updating participant in Automerge", {
      participantId: id,
      tripId: existing.tripId,
    });
    const doc = await automergeManager.updateParticipantData(
      existing.tripId,
      id,
      automergeUpdate,
    );

    // Step 2: Rebuild SQLite cache from Automerge doc
    participantLogger.debug("Rebuilding SQLite cache", {
      tripId: existing.tripId,
    });
    await rebuildTripCache(existing.tripId, doc);

    // Step 3: Load and return from SQLite (cache layer)
    const participant = await getParticipantById(id);
    if (!participant) {
      throw createAppError(
        "CACHE_DESYNC",
        `Participant ${id} updated in Automerge but missing from SQLite`,
        { details: { participantId: id, tripId: existing.tripId } },
      );
    }

    participantLogger.info("Participant updated (dual-write)", {
      participantId: id,
      name: participant.name,
    });
    return participant;
  } catch (error) {
    participantLogger.error("Failed to update participant", {
      participantId: id,
      error,
    });
    throw error;
  }
};

export const deleteParticipant = async (id: string): Promise<void> => {
  participantLogger.info("Deleting participant (dual-write)", {
    participantId: id,
  });

  try {
    // First, load participant to get tripId for cache rebuild
    const existing = await getParticipantById(id);
    if (!existing) {
      participantLogger.warn("Participant not found on delete", {
        participantId: id,
      });
      // Idempotent delete - no error if already gone
      return;
    }

    // Step 1: Remove participant from Automerge document (source of truth)
    participantLogger.debug("Removing participant from Automerge", {
      participantId: id,
      tripId: existing.tripId,
    });
    const doc = await automergeManager.removeParticipant(existing.tripId, id);

    // Step 2: Rebuild SQLite cache from Automerge doc
    participantLogger.debug("Rebuilding SQLite cache", {
      tripId: existing.tripId,
    });
    await rebuildTripCache(existing.tripId, doc);

    participantLogger.info("Participant deleted (dual-write)", {
      participantId: id,
      tripId: existing.tripId,
    });
  } catch (error) {
    participantLogger.error("Failed to delete participant", {
      participantId: id,
      error,
    });
    throw error;
  }
};

export const ParticipantRepository = {
  createParticipant,
  getParticipantsForTrip,
  getParticipantById,
  updateParticipant,
  deleteParticipant,
};
