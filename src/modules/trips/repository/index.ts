/**
 * TRIP REPOSITORY
 * LOCAL DATA ENGINEER: Trip-scoped CRUD operations with currency metadata
 */

import * as Crypto from 'expo-crypto';
import { db } from '@db/client';
import { trips as tripsTable, Trip as TripRow } from '@db/schema/trips';
import { eq } from 'drizzle-orm';
import { CreateTripInput, Trip, UpdateTripInput } from '../types';

const mapTrip = (row: TripRow): Trip => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  startDate: row.startDate,
  endDate: row.endDate ?? undefined,
  currency: row.currency,
  currencyCode: row.currencyCode,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const createTrip = async ({ name, currencyCode, description, startDate }: CreateTripInput): Promise<Trip> => {
  const now = new Date().toISOString();
  const tripId = Crypto.randomUUID();
  const effectiveStartDate = startDate ?? now;

  const [created] = await db
    .insert(tripsTable)
    .values({
      id: tripId,
      name,
      description,
      startDate: effectiveStartDate,
      currency: currencyCode,
      currencyCode,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return mapTrip(created);
};

export const getTrips = async (): Promise<Trip[]> => {
  const rows = await db.select().from(tripsTable);
  return rows.map(mapTrip);
};

export const getTripById = async (id: string): Promise<Trip | null> => {
  const rows = await db.select().from(tripsTable).where(eq(tripsTable.id, id)).limit(1);
  if (!rows.length) {
    return null;
  }
  return mapTrip(rows[0]);
};

export const updateTrip = async (id: string, patch: UpdateTripInput): Promise<Trip> => {
  const now = new Date().toISOString();
  const updatePayload: Partial<typeof tripsTable.$inferInsert> = {
    updatedAt: now,
  };

  if (patch.name !== undefined) updatePayload.name = patch.name;
  if (patch.description !== undefined) updatePayload.description = patch.description;
  if (patch.endDate !== undefined) updatePayload.endDate = patch.endDate;
  if (patch.currencyCode !== undefined) {
    updatePayload.currencyCode = patch.currencyCode;
    updatePayload.currency = patch.currencyCode;
  }

  const updatedRows = await db.update(tripsTable).set(updatePayload).where(eq(tripsTable.id, id)).returning();
  const updated = updatedRows[0];
  if (!updated) {
    throw new Error(`Trip not found for id ${id}`);
  }

  return mapTrip(updated);
};

export const deleteTrip = async (id: string): Promise<void> => {
  await db.delete(tripsTable).where(eq(tripsTable.id, id));
};

export const TripRepository = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
};
