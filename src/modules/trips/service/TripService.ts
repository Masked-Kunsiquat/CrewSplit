/**
 * TRIP SERVICE LAYER
 * SETTLEMENT INTEGRATION ENGINEER: Trip orchestration service
 *
 * Service layer for trip operations that orchestrates between:
 * - Repository layer (database operations)
 * - Cross-module dependencies (participants, expenses, settlements, categories)
 * - Multi-step operations (create with owner, cascade deletes)
 *
 * This layer handles:
 * - Creating trips with initial participant (device owner)
 * - Deleting trips with proper cascade cleanup
 * - Updating trips with validation
 * - Transaction safety for multi-step operations
 *
 * Uses dependency injection for testability.
 */

import type { Trip, CreateTripInput, UpdateTripInput } from "../types";
import { tripLogger } from "@utils/logger";
import { db } from "@db/client";
import { createNotFoundError, createAppError } from "@utils/errors";

/**
 * Transaction type from Drizzle ORM
 */
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Repository interface for trip CRUD operations
 */
export interface ITripRepository {
  createTrip(data: CreateTripInput, tx?: DbTransaction): Promise<Trip>;
  getTrips(): Promise<Trip[]>;
  getTripById(id: string, tx?: DbTransaction): Promise<Trip | null>;
  updateTrip(
    id: string,
    patch: UpdateTripInput,
    tx?: DbTransaction,
  ): Promise<Trip>;
  deleteTrip(id: string, tx?: DbTransaction): Promise<void>;
}

/**
 * Repository interface for participant operations
 */
export interface IParticipantRepository {
  createParticipant(
    data: {
      tripId: string;
      name: string;
      avatarColor?: string;
    },
    tx?: DbTransaction,
  ): Promise<{ id: string; tripId: string; name: string }>;
}

/**
 * Dependencies for TripService
 */
export interface TripServiceDependencies {
  tripRepository?: ITripRepository;
  participantRepository?: IParticipantRepository;
}

/**
 * Input for creating a trip with device owner as first participant
 */
export interface CreateTripWithOwnerInput extends CreateTripInput {
  deviceOwnerName: string;
  deviceOwnerAvatarColor?: string;
}

/**
 * Creates a new trip with the device owner as the first participant.
 * This is an atomic operation - both trip and participant are created in a transaction.
 *
 * @param data - Trip creation input with device owner information
 * @param deps - Injected dependencies (for testing)
 * @returns Created trip and participant
 *
 * @throws {Error} PARTICIPANT_CREATE_FAILED - Participant creation failed after trip created
 */
export async function createTripWithOwner(
  data: CreateTripWithOwnerInput,
  deps: TripServiceDependencies = {},
): Promise<{ trip: Trip; participantId: string }> {
  const { tripRepository, participantRepository } = deps;

  if (!tripRepository) {
    throw new Error("tripRepository dependency is required");
  }
  if (!participantRepository) {
    throw new Error("participantRepository dependency is required");
  }

  tripLogger.debug("Creating trip with device owner", {
    tripName: data.name,
    ownerName: data.deviceOwnerName,
  });

  // Extract trip-specific data
  const tripData: CreateTripInput = {
    name: data.name,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    currencyCode: data.currencyCode,
    emoji: data.emoji,
  };

  // Use transaction for atomic operation
  return await db.transaction(async (tx) => {
    // Create trip within transaction
    const trip = await tripRepository.createTrip(tripData, tx);

    try {
      // Add device owner as first participant within same transaction
      const participant = await participantRepository.createParticipant(
        {
          tripId: trip.id,
          name: data.deviceOwnerName,
          avatarColor: data.deviceOwnerAvatarColor,
        },
        tx,
      );

      tripLogger.info("Trip created with device owner", {
        tripId: trip.id,
        tripName: trip.name,
        participantId: participant.id,
        participantName: participant.name,
      });

      return { trip, participantId: participant.id };
    } catch (error) {
      tripLogger.error("Failed to add device owner participant", {
        tripId: trip.id,
        error,
      });

      // Transaction will automatically rollback on throw
      throw createAppError(
        "PARTICIPANT_CREATE_FAILED",
        `Failed to create participant for trip: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  });
}

/**
 * Updates an existing trip.
 *
 * @param tripId - ID of trip to update
 * @param patch - Partial trip update data
 * @param deps - Injected dependencies (for testing)
 * @returns Updated trip
 *
 * @throws {Error} TRIP_NOT_FOUND - Trip does not exist
 */
export async function updateTrip(
  tripId: string,
  patch: UpdateTripInput,
  deps: TripServiceDependencies = {},
): Promise<Trip> {
  const { tripRepository } = deps;

  if (!tripRepository) {
    throw new Error("tripRepository dependency is required");
  }

  // Verify trip exists before update
  const existing = await tripRepository.getTripById(tripId);
  if (!existing) {
    tripLogger.error("Trip not found on update", { tripId });
    throw createNotFoundError("TRIP_NOT_FOUND", "Trip", tripId);
  }

  tripLogger.debug("Updating trip via service", { tripId, patch });

  const updated = await tripRepository.updateTrip(tripId, patch);

  tripLogger.info("Trip updated", { tripId, name: updated.name });

  return updated;
}

/**
 * Deletes a trip and all associated data.
 *
 * Database CASCADE rules automatically delete:
 * - All participants for the trip
 * - All expenses for the trip (and their splits via cascade)
 * - All settlements for the trip
 * - All expense categories for the trip
 * - All trip-specific fx rates
 *
 * This function primarily handles validation and logging.
 *
 * @param tripId - ID of trip to delete
 * @param deps - Injected dependencies (for testing)
 *
 * @throws {Error} TRIP_NOT_FOUND - Trip does not exist
 */
export async function deleteTripWithCascades(
  tripId: string,
  deps: TripServiceDependencies = {},
): Promise<void> {
  const { tripRepository } = deps;

  if (!tripRepository) {
    throw new Error("tripRepository dependency is required");
  }

  // Verify trip exists before deletion
  const existing = await tripRepository.getTripById(tripId);
  if (!existing) {
    tripLogger.error("Trip not found on delete", { tripId });
    throw createNotFoundError("TRIP_NOT_FOUND", "Trip", tripId);
  }

  tripLogger.info("Deleting trip with cascades", {
    tripId,
    tripName: existing.name,
  });

  // Delete trip - database CASCADE will handle related records
  await tripRepository.deleteTrip(tripId);

  tripLogger.info(
    "Trip deleted successfully (cascaded participants, expenses, settlements, categories)",
    {
      tripId,
      tripName: existing.name,
    },
  );
}

/**
 * Deletes multiple trips in a single transaction.
 * Useful for bulk operations like clearing sample data.
 *
 * @param tripIds - Array of trip IDs to delete
 * @param deps - Injected dependencies (for testing)
 *
 * @throws {Error} TRIP_NOT_FOUND - If any trip does not exist, entire operation fails
 */
export async function deleteBulkTrips(
  tripIds: string[],
  deps: TripServiceDependencies = {},
): Promise<void> {
  const { tripRepository } = deps;

  if (!tripRepository) {
    throw new Error("tripRepository dependency is required");
  }

  if (tripIds.length === 0) {
    tripLogger.debug("No trips to delete (empty array)");
    return;
  }

  tripLogger.info("Bulk deleting trips", { count: tripIds.length, tripIds });

  // Use transaction for all-or-nothing deletion
  await db.transaction(async (tx) => {
    for (const tripId of tripIds) {
      // Verify each trip exists (within transaction)
      const existing = await tripRepository.getTripById(tripId, tx);
      if (!existing) {
        tripLogger.error("Trip not found in bulk delete", { tripId });
        throw createNotFoundError("TRIP_NOT_FOUND", "Trip", tripId); // Will rollback entire transaction
      }

      // Delete trip within transaction (CASCADE handles related records)
      await tripRepository.deleteTrip(tripId, tx);

      tripLogger.debug("Trip deleted in bulk operation", {
        tripId,
        tripName: existing.name,
      });
    }
  });

  tripLogger.info("Bulk delete completed successfully", {
    count: tripIds.length,
  });
}

/**
 * Gets a trip by ID.
 * Simple passthrough that validates dependencies and delegates to repository.
 *
 * @param tripId - Trip ID to load
 * @param deps - Injected dependencies (for testing)
 * @returns Trip or null if not found
 */
export async function getTripById(
  tripId: string,
  deps: TripServiceDependencies = {},
): Promise<Trip | null> {
  const { tripRepository } = deps;

  if (!tripRepository) {
    throw new Error("tripRepository dependency is required");
  }

  return tripRepository.getTripById(tripId);
}

/**
 * Gets all trips.
 * Simple passthrough for consistency.
 *
 * @param deps - Injected dependencies (for testing)
 * @returns Array of trips
 */
export async function getTrips(
  deps: TripServiceDependencies = {},
): Promise<Trip[]> {
  const { tripRepository } = deps;

  if (!tripRepository) {
    throw new Error("tripRepository dependency is required");
  }

  return tripRepository.getTrips();
}
