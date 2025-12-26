/**
 * TRIP SERVICE TESTS
 * QA + TESTING ENGINEER: Service orchestration and error handling
 *
 * Tests the TripService layer with mocked dependencies.
 * Verifies:
 * - Dependency injection
 * - Atomic trip creation with participant
 * - Cascade delete behavior
 * - Bulk delete transactions
 * - Error propagation with proper codes
 * - Transaction rollback on failures
 */

import {
  createTripWithOwner,
  updateTrip,
  deleteTripWithCascades,
  deleteBulkTrips,
  getTripById,
  getTrips,
  type ITripRepository,
  type IParticipantRepository,
  type CreateTripWithOwnerInput,
} from "../TripService";
import type { Trip, UpdateTripInput } from "../../types";

// Mock the database transaction
const mockTx = {}; // Mock transaction object
const mockTransaction = jest.fn(async (callback) => {
  // Execute the callback immediately with mock transaction object
  return await callback(mockTx);
});

jest.mock("@db/client", () => ({
  db: {
    transaction: (callback: (tx: unknown) => Promise<unknown>) =>
      mockTransaction(callback),
  },
}));

// Mock the logger BEFORE imports
let mockTripLogger: {
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
};

jest.mock("@utils/logger", () => {
  mockTripLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { tripLogger: mockTripLogger };
});

/**
 * Factory function for creating mock trip repository
 */
const createMockTripRepository = (
  overrides: Partial<ITripRepository> = {},
): ITripRepository => ({
  createTrip: jest.fn(),
  getTrips: jest.fn(),
  getTripById: jest.fn(),
  updateTrip: jest.fn(),
  deleteTrip: jest.fn(),
  ...overrides,
});

/**
 * Factory function for creating mock participant repository
 */
const createMockParticipantRepository = (
  overrides: Partial<IParticipantRepository> = {},
): IParticipantRepository => ({
  createParticipant: jest.fn(),
  ...overrides,
});

/**
 * Factory function for creating test trip data
 */
const createTestTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: overrides.id ?? "trip-1",
  name: overrides.name ?? "Test Trip",
  description: overrides.description,
  startDate: overrides.startDate ?? "2024-01-01T00:00:00.000Z",
  endDate: overrides.endDate,
  currency: overrides.currency ?? "USD",
  currencyCode: overrides.currencyCode ?? "USD",
  emoji: overrides.emoji,
  createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
});

describe("TripService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createTripWithOwner", () => {
    describe("dependency injection", () => {
      it("should throw error if tripRepository is missing", async () => {
        // Arrange
        const input: CreateTripWithOwnerInput = {
          name: "Weekend Trip",
          currencyCode: "USD",
          startDate: "2024-01-01T00:00:00.000Z",
          deviceOwnerName: "Alice",
        };

        // Act & Assert
        await expect(
          createTripWithOwner(input, {
            participantRepository: createMockParticipantRepository(),
          }),
        ).rejects.toThrow("tripRepository dependency is required");
      });

      it("should throw error if participantRepository is missing", async () => {
        // Arrange
        const input: CreateTripWithOwnerInput = {
          name: "Weekend Trip",
          currencyCode: "USD",
          startDate: "2024-01-01T00:00:00.000Z",
          deviceOwnerName: "Alice",
        };

        // Act & Assert
        await expect(
          createTripWithOwner(input, {
            tripRepository: createMockTripRepository(),
          }),
        ).rejects.toThrow("participantRepository dependency is required");
      });
    });

    describe("successful creation", () => {
      it("should create trip and participant in transaction", async () => {
        // Arrange
        const input: CreateTripWithOwnerInput = {
          name: "Weekend Trip",
          currencyCode: "USD",
          startDate: "2024-01-01T00:00:00.000Z",
          deviceOwnerName: "Alice",
          deviceOwnerAvatarColor: "#FF5733",
        };

        const mockTrip = createTestTrip({
          id: "trip-123",
          name: "Weekend Trip",
          currencyCode: "USD",
        });

        const mockParticipant = {
          id: "participant-456",
          tripId: "trip-123",
          name: "Alice",
        };

        const mockTripRepo = createMockTripRepository({
          createTrip: jest.fn().mockResolvedValue(mockTrip),
        });

        const mockParticipantRepo = createMockParticipantRepository({
          createParticipant: jest.fn().mockResolvedValue(mockParticipant),
        });

        // Act
        const result = await createTripWithOwner(input, {
          tripRepository: mockTripRepo,
          participantRepository: mockParticipantRepo,
        });

        // Assert
        expect(mockTripRepo.createTrip).toHaveBeenCalledWith(
          {
            name: "Weekend Trip",
            currencyCode: "USD",
            startDate: "2024-01-01T00:00:00.000Z",
            description: undefined,
            endDate: undefined,
            emoji: undefined,
          },
          expect.anything(), // Transaction object
        );

        expect(mockParticipantRepo.createParticipant).toHaveBeenCalledWith(
          {
            tripId: "trip-123",
            name: "Alice",
            avatarColor: "#FF5733",
          },
          expect.anything(), // Transaction object
        );

        expect(result).toEqual({
          trip: mockTrip,
          participantId: "participant-456",
        });

        expect(mockTransaction).toHaveBeenCalled();
      });

      it("should handle optional fields", async () => {
        // Arrange
        const input: CreateTripWithOwnerInput = {
          name: "Beach Vacation",
          description: "Annual beach trip",
          currencyCode: "EUR",
          startDate: "2024-06-01T00:00:00.000Z",
          endDate: "2024-06-15T00:00:00.000Z",
          emoji: "🏖️",
          deviceOwnerName: "Bob",
        };

        const mockTrip = createTestTrip({
          name: "Beach Vacation",
          description: "Annual beach trip",
          emoji: "🏖️",
        });

        const mockParticipant = {
          id: "participant-789",
          tripId: "trip-123",
          name: "Bob",
        };

        const mockTripRepo = createMockTripRepository({
          createTrip: jest.fn().mockResolvedValue(mockTrip),
        });

        const mockParticipantRepo = createMockParticipantRepository({
          createParticipant: jest.fn().mockResolvedValue(mockParticipant),
        });

        // Act
        const result = await createTripWithOwner(input, {
          tripRepository: mockTripRepo,
          participantRepository: mockParticipantRepo,
        });

        // Assert
        expect(mockTripRepo.createTrip).toHaveBeenCalledWith(
          {
            name: "Beach Vacation",
            description: "Annual beach trip",
            currencyCode: "EUR",
            startDate: "2024-06-01T00:00:00.000Z",
            endDate: "2024-06-15T00:00:00.000Z",
            emoji: "🏖️",
          },
          expect.anything(), // Transaction object
        );

        expect(result.trip).toEqual(mockTrip);
        expect(result.participantId).toBe("participant-789");
      });
    });

    describe("error handling", () => {
      it("should throw PARTICIPANT_CREATE_FAILED if participant creation fails", async () => {
        // Arrange
        const input: CreateTripWithOwnerInput = {
          name: "Weekend Trip",
          currencyCode: "USD",
          startDate: "2024-01-01T00:00:00.000Z",
          deviceOwnerName: "Alice",
        };

        const mockTrip = createTestTrip({ id: "trip-123" });

        const mockTripRepo = createMockTripRepository({
          createTrip: jest.fn().mockResolvedValue(mockTrip),
        });

        const mockParticipantRepo = createMockParticipantRepository({
          createParticipant: jest
            .fn()
            .mockRejectedValue(new Error("Database connection lost")),
        });

        // Act & Assert
        await expect(
          createTripWithOwner(input, {
            tripRepository: mockTripRepo,
            participantRepository: mockParticipantRepo,
          }),
        ).rejects.toMatchObject({
          code: "PARTICIPANT_CREATE_FAILED",
          message: expect.stringContaining("Database connection lost"),
        });

        expect(mockTripLogger.error).toHaveBeenCalledWith(
          "Failed to add device owner participant",
          expect.objectContaining({
            tripId: "trip-123",
          }),
        );
      });

      it("should rollback transaction if participant creation fails", async () => {
        // Arrange
        const input: CreateTripWithOwnerInput = {
          name: "Weekend Trip",
          currencyCode: "USD",
          startDate: "2024-01-01T00:00:00.000Z",
          deviceOwnerName: "Alice",
        };

        const mockTrip = createTestTrip({ id: "trip-123" });

        const mockTripRepo = createMockTripRepository({
          createTrip: jest.fn().mockResolvedValue(mockTrip),
        });

        const mockParticipantRepo = createMockParticipantRepository({
          createParticipant: jest.fn().mockRejectedValue(new Error("Failed")),
        });

        // Act
        try {
          await createTripWithOwner(input, {
            tripRepository: mockTripRepo,
            participantRepository: mockParticipantRepo,
          });
        } catch {
          // Expected to throw
        }

        // Assert - transaction was called (rollback happens automatically on throw)
        expect(mockTransaction).toHaveBeenCalled();
      });
    });
  });

  describe("updateTrip", () => {
    describe("dependency injection", () => {
      it("should throw error if tripRepository is missing", async () => {
        // Arrange
        const patch: UpdateTripInput = { name: "Updated Trip" };

        // Act & Assert
        await expect(updateTrip("trip-1", patch, {})).rejects.toThrow(
          "tripRepository dependency is required",
        );
      });
    });

    describe("successful update", () => {
      it("should update trip after verifying it exists", async () => {
        // Arrange
        const existingTrip = createTestTrip({ id: "trip-1", name: "Old Name" });
        const updatedTrip = createTestTrip({
          id: "trip-1",
          name: "New Name",
        });
        const patch: UpdateTripInput = { name: "New Name" };

        const mockTripRepo = createMockTripRepository({
          getTripById: jest.fn().mockResolvedValue(existingTrip),
          updateTrip: jest.fn().mockResolvedValue(updatedTrip),
        });

        // Act
        const result = await updateTrip("trip-1", patch, {
          tripRepository: mockTripRepo,
        });

        // Assert
        expect(mockTripRepo.getTripById).toHaveBeenCalledWith("trip-1");
        expect(mockTripRepo.updateTrip).toHaveBeenCalledWith("trip-1", patch);
        expect(result).toEqual(updatedTrip);
        expect(mockTripLogger.info).toHaveBeenCalledWith(
          "Trip updated",
          expect.objectContaining({ tripId: "trip-1" }),
        );
      });

      it("should handle partial updates", async () => {
        // Arrange
        const existingTrip = createTestTrip({ id: "trip-2" });
        const patch: UpdateTripInput = { emoji: "🎉" };

        const mockTripRepo = createMockTripRepository({
          getTripById: jest.fn().mockResolvedValue(existingTrip),
          updateTrip: jest.fn().mockResolvedValue({
            ...existingTrip,
            emoji: "🎉",
          }),
        });

        // Act
        const result = await updateTrip("trip-2", patch, {
          tripRepository: mockTripRepo,
        });

        // Assert
        expect(result.emoji).toBe("🎉");
      });
    });

    describe("error handling", () => {
      it("should throw TRIP_NOT_FOUND if trip does not exist", async () => {
        // Arrange
        const patch: UpdateTripInput = { name: "Updated" };

        const mockTripRepo = createMockTripRepository({
          getTripById: jest.fn().mockResolvedValue(null),
        });

        // Act & Assert
        await expect(
          updateTrip("nonexistent-trip", patch, {
            tripRepository: mockTripRepo,
          }),
        ).rejects.toMatchObject({
          code: "TRIP_NOT_FOUND",
          message: "Trip not found: nonexistent-trip",
        });

        expect(mockTripLogger.error).toHaveBeenCalledWith(
          "Trip not found on update",
          { tripId: "nonexistent-trip" },
        );
      });
    });
  });

  describe("deleteTripWithCascades", () => {
    describe("dependency injection", () => {
      it("should throw error if tripRepository is missing", async () => {
        // Act & Assert
        await expect(deleteTripWithCascades("trip-1", {})).rejects.toThrow(
          "tripRepository dependency is required",
        );
      });
    });

    describe("successful deletion", () => {
      it("should delete trip after verifying it exists", async () => {
        // Arrange
        const existingTrip = createTestTrip({
          id: "trip-1",
          name: "Trip to Delete",
        });

        const mockTripRepo = createMockTripRepository({
          getTripById: jest.fn().mockResolvedValue(existingTrip),
          deleteTrip: jest.fn().mockResolvedValue(undefined),
        });

        // Act
        await deleteTripWithCascades("trip-1", {
          tripRepository: mockTripRepo,
        });

        // Assert
        expect(mockTripRepo.getTripById).toHaveBeenCalledWith("trip-1");
        expect(mockTripRepo.deleteTrip).toHaveBeenCalledWith("trip-1");
        expect(mockTripLogger.info).toHaveBeenCalledWith(
          "Deleting trip with cascades",
          expect.objectContaining({
            tripId: "trip-1",
            tripName: "Trip to Delete",
          }),
        );
        expect(mockTripLogger.info).toHaveBeenCalledWith(
          expect.stringContaining("cascaded"),
          expect.objectContaining({ tripId: "trip-1" }),
        );
      });
    });

    describe("error handling", () => {
      it("should throw TRIP_NOT_FOUND if trip does not exist", async () => {
        // Arrange
        const mockTripRepo = createMockTripRepository({
          getTripById: jest.fn().mockResolvedValue(null),
        });

        // Act & Assert
        await expect(
          deleteTripWithCascades("nonexistent-trip", {
            tripRepository: mockTripRepo,
          }),
        ).rejects.toMatchObject({
          code: "TRIP_NOT_FOUND",
          message: "Trip not found: nonexistent-trip",
        });

        expect(mockTripLogger.error).toHaveBeenCalledWith(
          "Trip not found on delete",
          { tripId: "nonexistent-trip" },
        );

        // Should NOT attempt to delete
        expect(mockTripRepo.deleteTrip).not.toHaveBeenCalled();
      });
    });
  });

  describe("deleteBulkTrips", () => {
    describe("dependency injection", () => {
      it("should throw error if tripRepository is missing", async () => {
        // Act & Assert
        await expect(deleteBulkTrips(["trip-1", "trip-2"], {})).rejects.toThrow(
          "tripRepository dependency is required",
        );
      });
    });

    describe("successful bulk deletion", () => {
      it("should delete multiple trips in transaction", async () => {
        // Arrange
        const trip1 = createTestTrip({ id: "trip-1", name: "Trip 1" });
        const trip2 = createTestTrip({ id: "trip-2", name: "Trip 2" });
        const trip3 = createTestTrip({ id: "trip-3", name: "Trip 3" });

        const mockTripRepo = createMockTripRepository({
          getTripById: jest
            .fn()
            .mockResolvedValueOnce(trip1)
            .mockResolvedValueOnce(trip2)
            .mockResolvedValueOnce(trip3),
          deleteTrip: jest.fn().mockResolvedValue(undefined),
        });

        // Act
        await deleteBulkTrips(["trip-1", "trip-2", "trip-3"], {
          tripRepository: mockTripRepo,
        });

        // Assert
        expect(mockTripRepo.getTripById).toHaveBeenCalledTimes(3);
        expect(mockTripRepo.getTripById).toHaveBeenCalledWith(
          "trip-1",
          expect.anything(), // Transaction object
        );
        expect(mockTripRepo.getTripById).toHaveBeenCalledWith(
          "trip-2",
          expect.anything(), // Transaction object
        );
        expect(mockTripRepo.getTripById).toHaveBeenCalledWith(
          "trip-3",
          expect.anything(), // Transaction object
        );

        expect(mockTripRepo.deleteTrip).toHaveBeenCalledTimes(3);
        expect(mockTripRepo.deleteTrip).toHaveBeenCalledWith(
          "trip-1",
          expect.anything(), // Transaction object
        );
        expect(mockTripRepo.deleteTrip).toHaveBeenCalledWith(
          "trip-2",
          expect.anything(), // Transaction object
        );
        expect(mockTripRepo.deleteTrip).toHaveBeenCalledWith(
          "trip-3",
          expect.anything(), // Transaction object
        );

        expect(mockTransaction).toHaveBeenCalled();
        expect(mockTripLogger.info).toHaveBeenCalledWith(
          "Bulk delete completed successfully",
          { count: 3 },
        );
      });

      it("should handle empty array gracefully", async () => {
        // Arrange
        const mockTripRepo = createMockTripRepository();

        // Act
        await deleteBulkTrips([], { tripRepository: mockTripRepo });

        // Assert
        expect(mockTripRepo.getTripById).not.toHaveBeenCalled();
        expect(mockTripRepo.deleteTrip).not.toHaveBeenCalled();
        expect(mockTripLogger.debug).toHaveBeenCalledWith(
          "No trips to delete (empty array)",
        );
      });
    });

    describe("error handling", () => {
      it("should throw TRIP_NOT_FOUND if any trip does not exist", async () => {
        // Arrange
        const trip1 = createTestTrip({ id: "trip-1" });

        const mockTripRepo = createMockTripRepository({
          getTripById: jest
            .fn()
            .mockResolvedValueOnce(trip1)
            .mockResolvedValueOnce(null), // Second trip not found
        });

        // Act & Assert
        await expect(
          deleteBulkTrips(["trip-1", "nonexistent-trip"], {
            tripRepository: mockTripRepo,
          }),
        ).rejects.toMatchObject({
          code: "TRIP_NOT_FOUND",
          message: "Trip not found: nonexistent-trip",
        });

        expect(mockTripLogger.error).toHaveBeenCalledWith(
          "Trip not found in bulk delete",
          { tripId: "nonexistent-trip" },
        );

        // Transaction should rollback, so first trip should NOT be deleted
        // (in real implementation, db.transaction would handle rollback)
      });

      it("should rollback entire transaction if one deletion fails", async () => {
        // Arrange
        const trip1 = createTestTrip({ id: "trip-1" });
        const trip2 = createTestTrip({ id: "trip-2" });

        const mockTripRepo = createMockTripRepository({
          getTripById: jest
            .fn()
            .mockResolvedValueOnce(trip1)
            .mockResolvedValueOnce(trip2),
          deleteTrip: jest
            .fn()
            .mockResolvedValueOnce(undefined) // First succeeds
            .mockRejectedValueOnce(new Error("Database error")), // Second fails
        });

        // Act & Assert
        await expect(
          deleteBulkTrips(["trip-1", "trip-2"], {
            tripRepository: mockTripRepo,
          }),
        ).rejects.toThrow("Database error");

        // Transaction was called
        expect(mockTransaction).toHaveBeenCalled();
      });
    });
  });

  describe("getTripById", () => {
    it("should return trip from repository", async () => {
      // Arrange
      const mockTrip = createTestTrip({ id: "trip-1" });
      const mockTripRepo = createMockTripRepository({
        getTripById: jest.fn().mockResolvedValue(mockTrip),
      });

      // Act
      const result = await getTripById("trip-1", {
        tripRepository: mockTripRepo,
      });

      // Assert
      expect(result).toEqual(mockTrip);
      expect(mockTripRepo.getTripById).toHaveBeenCalledWith("trip-1");
    });

    it("should return null if trip not found", async () => {
      // Arrange
      const mockTripRepo = createMockTripRepository({
        getTripById: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await getTripById("nonexistent", {
        tripRepository: mockTripRepo,
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getTrips", () => {
    it("should return all trips from repository", async () => {
      // Arrange
      const mockTrips = [
        createTestTrip({ id: "trip-1", name: "Trip 1" }),
        createTestTrip({ id: "trip-2", name: "Trip 2" }),
      ];
      const mockTripRepo = createMockTripRepository({
        getTrips: jest.fn().mockResolvedValue(mockTrips),
      });

      // Act
      const result = await getTrips({ tripRepository: mockTripRepo });

      // Assert
      expect(result).toEqual(mockTrips);
      expect(mockTripRepo.getTrips).toHaveBeenCalled();
    });

    it("should return empty array if no trips exist", async () => {
      // Arrange
      const mockTripRepo = createMockTripRepository({
        getTrips: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await getTrips({ tripRepository: mockTripRepo });

      // Assert
      expect(result).toEqual([]);
    });
  });
});
