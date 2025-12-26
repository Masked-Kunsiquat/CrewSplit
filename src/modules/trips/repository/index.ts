/**
 * TRIP REPOSITORY
 * LOCAL DATA ENGINEER: Trip-scoped CRUD operations with currency metadata
 */

import * as Crypto from "expo-crypto";
import { db } from "@db/client";
import { trips as tripsTable, Trip as TripRow } from "@db/schema/trips";
import { eq } from "drizzle-orm";
import { CreateTripInput, Trip, UpdateTripInput } from "../types";
import { tripLogger } from "@utils/logger";
import { createNotFoundError } from "@utils/errors";

/**
 * Transaction type from Drizzle ORM
 */
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const mapTrip = (row: TripRow): Trip => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  startDate: row.startDate,
  endDate: row.endDate ?? undefined,
  currency: row.currency,
  currencyCode: row.currencyCode,
  emoji: row.emoji ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const createTrip = async (
  {
    name,
    currencyCode,
    description,
    startDate,
    endDate,
    emoji,
  }: CreateTripInput,
  tx?: DbTransaction,
): Promise<Trip> => {
  const now = new Date().toISOString();
  const tripId = Crypto.randomUUID();
  const effectiveStartDate = startDate ?? now;

  tripLogger.debug("Creating trip", { tripId, name, currencyCode, emoji });

  const dbInstance = tx ?? db;
  const [created] = await dbInstance
    .insert(tripsTable)
    .values({
      id: tripId,
      name,
      description,
      startDate: effectiveStartDate,
      endDate,
      currency: currencyCode,
      currencyCode,
      emoji,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  tripLogger.info("Trip created", { tripId, name, currencyCode });
  return mapTrip(created);
};

export const getTrips = async (): Promise<Trip[]> => {
  const rows = await db.select().from(tripsTable);
  tripLogger.debug("Loaded trips", { count: rows.length });
  return rows.map(mapTrip);
};

export const getTripById = async (
  id: string,
  tx?: DbTransaction,
): Promise<Trip | null> => {
  const dbInstance = tx ?? db;
  const rows = await dbInstance
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.id, id))
    .limit(1);
  if (!rows.length) {
    tripLogger.warn("Trip not found", { tripId: id });
    return null;
  }
  tripLogger.debug("Loaded trip", { tripId: id, name: rows[0].name });
  return mapTrip(rows[0]);
};

export const updateTrip = async (
  id: string,
  patch: UpdateTripInput,
  tx?: DbTransaction,
): Promise<Trip> => {
  const now = new Date().toISOString();
  const updatePayload: Partial<typeof tripsTable.$inferInsert> = {
    updatedAt: now,
  };

  if (patch.name !== undefined) updatePayload.name = patch.name;
  if (patch.description !== undefined)
    updatePayload.description = patch.description;
  if (patch.endDate !== undefined) updatePayload.endDate = patch.endDate;
  if (patch.emoji !== undefined) updatePayload.emoji = patch.emoji;
  if (patch.currencyCode !== undefined) {
    updatePayload.currencyCode = patch.currencyCode;
    updatePayload.currency = patch.currencyCode;
  }

  tripLogger.debug("Updating trip", { tripId: id });

  const dbInstance = tx ?? db;
  const updatedRows = await dbInstance
    .update(tripsTable)
    .set(updatePayload)
    .where(eq(tripsTable.id, id))
    .returning();
  const updated = updatedRows[0];
  if (!updated) {
    tripLogger.error("Trip not found on update", { tripId: id });
    throw createNotFoundError("TRIP_NOT_FOUND", "Trip", id);
  }

  tripLogger.info("Trip updated", { tripId: id, name: updated.name });
  return mapTrip(updated);
};

export const deleteTrip = async (
  id: string,
  tx?: DbTransaction,
): Promise<void> => {
  tripLogger.info("Deleting trip", { tripId: id });
  const dbInstance = tx ?? db;
  await dbInstance.delete(tripsTable).where(eq(tripsTable.id, id));
  tripLogger.info("Trip deleted", { tripId: id });
};

export const TripRepository = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
};
