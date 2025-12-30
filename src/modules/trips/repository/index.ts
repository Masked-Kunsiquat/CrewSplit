/**
 * TRIP REPOSITORY
 * LOCAL DATA ENGINEER: Trip-scoped CRUD operations with currency metadata
 * DUAL-WRITE: Writes to Automerge first, then rebuilds SQLite cache
 */

import * as Crypto from "expo-crypto";
import { db } from "@db/client";
import { trips as tripsTable, Trip as TripRow } from "@db/schema/trips";
import { eq } from "drizzle-orm";
import { CreateTripInput, Trip, UpdateTripInput } from "../types";
import { tripLogger } from "@utils/logger";
import { createAppError } from "@utils/errors";
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

  tripLogger.debug("Creating trip (dual-write)", {
    tripId,
    name,
    currencyCode,
    emoji,
  });

  try {
    // Step 1: Create Automerge document (source of truth)
    tripLogger.debug("Creating trip in Automerge", { tripId });
    const doc = await automergeManager.createTrip({
      id: tripId,
      name,
      emoji: emoji ?? "🌍",
      currency: currencyCode,
      startDate: effectiveStartDate,
      endDate: endDate ?? null,
    });

    // Step 2: Rebuild SQLite cache from Automerge doc
    tripLogger.debug("Rebuilding SQLite cache", { tripId });
    await rebuildTripCache(tripId, doc);

    // Step 3: Load and return from SQLite (cache layer)
    const trip = await getTripById(tripId, tx);
    if (!trip) {
      throw createAppError(
        "CACHE_DESYNC",
        `Trip ${tripId} created in Automerge but missing from SQLite`,
        { details: { tripId } },
      );
    }

    tripLogger.info("Trip created (dual-write)", {
      tripId,
      name,
      currencyCode,
    });
    return trip;
  } catch (error) {
    tripLogger.error("Failed to create trip", { tripId, error });
    throw error;
  }
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
  tripLogger.debug("Updating trip (dual-write)", { tripId: id });

  try {
    // Build Automerge update payload
    const automergeUpdate: {
      name?: string;
      emoji?: string;
      currency?: string;
      endDate?: string | null;
    } = {};

    if (patch.name !== undefined) automergeUpdate.name = patch.name;
    if (patch.emoji !== undefined) automergeUpdate.emoji = patch.emoji;
    if (patch.currencyCode !== undefined)
      automergeUpdate.currency = patch.currencyCode;
    if (patch.endDate !== undefined) automergeUpdate.endDate = patch.endDate;

    // Step 1: Update Automerge document (source of truth)
    tripLogger.debug("Updating trip in Automerge", { tripId: id });
    const doc = await automergeManager.updateTrip(id, automergeUpdate);

    // Step 2: Rebuild SQLite cache from Automerge doc
    tripLogger.debug("Rebuilding SQLite cache", { tripId: id });
    await rebuildTripCache(id, doc);

    // Step 3: Load and return from SQLite (cache layer)
    const trip = await getTripById(id, tx);
    if (!trip) {
      throw createAppError(
        "CACHE_DESYNC",
        `Trip ${id} updated in Automerge but missing from SQLite`,
        { details: { tripId: id } },
      );
    }

    tripLogger.info("Trip updated (dual-write)", {
      tripId: id,
      name: trip.name,
    });
    return trip;
  } catch (error) {
    tripLogger.error("Failed to update trip", { tripId: id, error });
    throw error;
  }
};

export const deleteTrip = async (
  id: string,
  tx?: DbTransaction,
): Promise<void> => {
  tripLogger.info("Deleting trip (dual-write)", { tripId: id });

  try {
    // Step 1: Delete Automerge document (source of truth)
    tripLogger.debug("Deleting trip from Automerge", { tripId: id });
    await automergeManager.deleteTrip(id);

    // Step 2: Delete from SQLite (cache layer)
    tripLogger.debug("Deleting trip from SQLite", { tripId: id });
    const dbInstance = tx ?? db;
    await dbInstance.delete(tripsTable).where(eq(tripsTable.id, id));

    tripLogger.info("Trip deleted (dual-write)", { tripId: id });
  } catch (error) {
    tripLogger.error("Failed to delete trip", { tripId: id, error });
    throw error;
  }
};

export const TripRepository = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
};
