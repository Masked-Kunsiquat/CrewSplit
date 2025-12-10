/**
 * PARTICIPANT REPOSITORY
 * LOCAL DATA ENGINEER: Trip-scoped participant CRUD helpers
 */

import * as Crypto from 'expo-crypto';
import { db } from '@db/client';
import { participants as participantsTable, Participant as ParticipantRow } from '@db/schema/participants';
import { eq } from 'drizzle-orm';
import { CreateParticipantInput, Participant, UpdateParticipantInput } from '../types';

const mapParticipant = (row: ParticipantRow): Participant => ({
  id: row.id,
  tripId: row.tripId,
  name: row.name,
  avatarColor: row.avatarColor ?? undefined,
  createdAt: row.createdAt,
});

export const createParticipant = async (input: CreateParticipantInput): Promise<Participant> => {
  const now = new Date().toISOString();
  const participantId = Crypto.randomUUID();

  const [created] = await db
    .insert(participantsTable)
    .values({
      id: participantId,
      tripId: input.tripId,
      name: input.name,
      avatarColor: input.avatarColor,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return mapParticipant(created);
};

export const getParticipantsForTrip = async (tripId: string): Promise<Participant[]> => {
  const rows = await db.select().from(participantsTable).where(eq(participantsTable.tripId, tripId));
  return rows.map(mapParticipant);
};

export const getParticipantById = async (id: string): Promise<Participant | null> => {
  const rows = await db.select().from(participantsTable).where(eq(participantsTable.id, id)).limit(1);
  if (!rows.length) return null;
  return mapParticipant(rows[0]);
};

export const updateParticipant = async (id: string, patch: UpdateParticipantInput): Promise<Participant> => {
  const now = new Date().toISOString();
  const updatePayload: Partial<typeof participantsTable.$inferInsert> = {
    updatedAt: now,
  };

  if (patch.name !== undefined) updatePayload.name = patch.name;
  if (patch.avatarColor !== undefined) updatePayload.avatarColor = patch.avatarColor;

  const updatedRows = await db.update(participantsTable).set(updatePayload).where(eq(participantsTable.id, id)).returning();
  const updated = updatedRows[0];
  if (!updated) {
    throw new Error(`Participant not found for id ${id}`);
  }

  return mapParticipant(updated);
};

export const deleteParticipant = async (id: string): Promise<void> => {
  await db.delete(participantsTable).where(eq(participantsTable.id, id));
};

export const ParticipantRepository = {
  createParticipant,
  getParticipantsForTrip,
  getParticipantById,
  updateParticipant,
  deleteParticipant,
};
