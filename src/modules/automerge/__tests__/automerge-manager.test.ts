/**
 * AUTOMERGE MODULE - AutomergeManager Integration Tests
 * QA + TESTING ENGINEER: Integration tests for service layer
 *
 * Tests the AutomergeManager service with mocked storage
 */

import * as Automerge from "@automerge/automerge";
import { AutomergeManager, IAutomergeStorage } from "../service/AutomergeManager";
import type { TripAutomergeDoc, TripParticipant } from "../types";
import { CURRENT_SCHEMA_VERSION } from "../engine/doc-schema";

// Helper to create test document
function createTestDoc(overrides: Partial<TripAutomergeDoc> = {}): Automerge.Doc<TripAutomergeDoc> {
  let doc = Automerge.init<TripAutomergeDoc>();
  doc = Automerge.change(doc, "init", (d) => {
    (d as any).id = "trip-1";
    (d as any).name = "Test Trip";
    (d as any).emoji = "🌍";
    (d as any).currency = "USD";
    (d as any).startDate = "2024-01-01";
    (d as any).endDate = null;
    (d as any).createdAt = "2024-01-01T00:00:00Z";
    (d as any).updatedAt = "2024-01-01T00:00:00Z";
    (d as any).participants = {};
    (d as any).expenses = {};
    (d as any).settlements = {};
    (d as any)._metadata = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastSyncedAt: null,
    };

    // Apply overrides
    for (const [key, value] of Object.entries(overrides)) {
      (d as any)[key] = value;
    }
  });
  return doc;
}

describe("AutomergeManager", () => {
  let mockStorage: jest.Mocked<IAutomergeStorage>;
  let manager: AutomergeManager;

  beforeEach(() => {
    // Create mock storage
    mockStorage = {
      saveDoc: jest.fn(),
      loadDoc: jest.fn(),
      deleteDoc: jest.fn(),
      docExists: jest.fn(),
    };

    manager = new AutomergeManager(mockStorage);
  });

  describe("createTrip", () => {
    it("should create a new trip document", async () => {
      mockStorage.saveDoc.mockResolvedValue(undefined);

      const doc = await manager.createTrip({
        id: "trip-1",
        name: "Paris Trip",
        emoji: "🗼",
        currency: "EUR",
        startDate: "2024-01-01",
        endDate: null,
      });

      expect(doc.id).toBe("trip-1");
      expect(doc.name).toBe("Paris Trip");
      expect(doc.emoji).toBe("🗼");
      expect(doc.currency).toBe("EUR");
      expect(doc._metadata.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(mockStorage.saveDoc).toHaveBeenCalledWith("trip-1", expect.anything());
    });

    it("should create document with empty collections", async () => {
      mockStorage.saveDoc.mockResolvedValue(undefined);

      const doc = await manager.createTrip({
        id: "trip-2",
        name: "Tokyo Trip",
        emoji: "🗾",
        currency: "JPY",
        startDate: "2024-01-01",
        endDate: "2024-01-10",
      });

      expect(Object.keys(doc.participants)).toHaveLength(0);
      expect(Object.keys(doc.expenses)).toHaveLength(0);
      expect(Object.keys(doc.settlements)).toHaveLength(0);
    });
  });

  describe("loadTrip", () => {
    it("should load an existing trip document", async () => {
      const existingDoc = createTestDoc({
        name: "Existing Trip",
        emoji: "✈️",
      });

      mockStorage.loadDoc.mockResolvedValue({
        doc: existingDoc,
        exists: true,
      });

      const doc = await manager.loadTrip("trip-1");

      expect(doc).not.toBeNull();
      expect(doc?.id).toBe("trip-1");
      expect(doc?.name).toBe("Existing Trip");
      expect(mockStorage.loadDoc).toHaveBeenCalledWith("trip-1");
    });

    it("should return null if trip does not exist", async () => {
      mockStorage.loadDoc.mockResolvedValue({
        doc: Automerge.init<TripAutomergeDoc>(),
        exists: false,
      });

      const doc = await manager.loadTrip("trip-nonexistent");

      expect(doc).toBeNull();
    });

    it("should throw if document validation fails", async () => {
      let invalidDoc = Automerge.init<any>();
      invalidDoc = Automerge.change(invalidDoc, "init", (d) => {
        (d as any).id = "trip-1";
        // Missing required fields
      });

      mockStorage.loadDoc.mockResolvedValue({
        doc: invalidDoc,
        exists: true,
      });

      await expect(manager.loadTrip("trip-1")).rejects.toThrow("failed validation");
    });
  });

  describe("updateTrip", () => {
    it("should update trip metadata", async () => {
      const existingDoc = createTestDoc({
        name: "Old Name",
      });

      mockStorage.loadDoc.mockResolvedValue({
        doc: existingDoc,
        exists: true,
      });
      mockStorage.saveDoc.mockResolvedValue(undefined);

      const updatedDoc = await manager.updateTrip("trip-1", {
        name: "New Name",
        emoji: "🎉",
      });

      expect(updatedDoc.name).toBe("New Name");
      expect(updatedDoc.emoji).toBe("🎉");
      expect(mockStorage.saveDoc).toHaveBeenCalled();
    });

    it("should throw if trip does not exist", async () => {
      mockStorage.loadDoc.mockResolvedValue({
        doc: Automerge.init<TripAutomergeDoc>(),
        exists: false,
      });

      await expect(
        manager.updateTrip("trip-nonexistent", { name: "New Name" }),
      ).rejects.toThrow("not found");
    });
  });

  describe("addParticipant", () => {
    it("should add a participant to the trip", async () => {
      const existingDoc = createTestDoc();

      mockStorage.loadDoc.mockResolvedValue({
        doc: existingDoc,
        exists: true,
      });
      mockStorage.saveDoc.mockResolvedValue(undefined);

      const updatedDoc = await manager.addParticipant("trip-1", {
        id: "p1",
        name: "Alice",
        color: "#FF5733",
      });

      expect(updatedDoc.participants["p1"]).toBeDefined();
      expect(updatedDoc.participants["p1"].name).toBe("Alice");
      expect(updatedDoc.participants["p1"].color).toBe("#FF5733");
    });

    it("should throw if trip does not exist", async () => {
      mockStorage.loadDoc.mockResolvedValue({
        doc: Automerge.init<TripAutomergeDoc>(),
        exists: false,
      });

      await expect(
        manager.addParticipant("trip-nonexistent", {
          id: "p1",
          name: "Alice",
          color: "#FF5733",
        }),
      ).rejects.toThrow("not found");
    });
  });

  describe("addExpense", () => {
    it("should add an expense to the trip", async () => {
      const existingDoc = Automerge.change(createTestDoc(), "add participant", (d) => {
        d.participants.p1 = {
          id: "p1",
          name: "Alice",
          color: "#FF5733",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        };
      });

      mockStorage.loadDoc.mockResolvedValue({
        doc: existingDoc,
        exists: true,
      });
      mockStorage.saveDoc.mockResolvedValue(undefined);

      const updatedDoc = await manager.addExpense("trip-1", {
        id: "e1",
        description: "Dinner",
        originalAmountMinor: 5000,
        originalCurrency: "USD",
        convertedAmountMinor: 5000,
        fxRateToTrip: null,
        categoryId: null,
        paidById: "p1",
        date: "2024-01-01",
        splits: {
          p1: { shareType: "equal", shareValue: 1 },
        },
      });

      expect(updatedDoc.expenses["e1"]).toBeDefined();
      expect(updatedDoc.expenses["e1"].description).toBe("Dinner");
      expect(updatedDoc.expenses["e1"].originalAmountMinor).toBe(5000);
    });
  });

  describe("addSettlement", () => {
    it("should add a settlement to the trip", async () => {
      const existingDoc = Automerge.change(createTestDoc(), "add participants", (d) => {
        (d as any).participants.p1 = {
          id: "p1",
          name: "Alice",
          color: "#FF5733",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        };
        (d as any).participants.p2 = {
          id: "p2",
          name: "Bob",
          color: "#33FF57",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        };
      });

      mockStorage.loadDoc.mockResolvedValue({
        doc: existingDoc,
        exists: true,
      });
      mockStorage.saveDoc.mockResolvedValue(undefined);

      const updatedDoc = await manager.addSettlement("trip-1", {
        id: "s1",
        fromParticipantId: "p2",
        toParticipantId: "p1",
        originalAmountMinor: 2500,
        originalCurrency: "USD",
        convertedAmountMinor: 2500,
        fxRateToTrip: null,
        date: "2024-01-01",
        description: "Payment",
        paymentMethod: "venmo",
        expenseSplitId: null,
      });

      expect(updatedDoc.settlements["s1"]).toBeDefined();
      expect(updatedDoc.settlements["s1"].fromParticipantId).toBe("p2");
      expect(updatedDoc.settlements["s1"].toParticipantId).toBe("p1");
      expect(updatedDoc.settlements["s1"].originalAmountMinor).toBe(2500);
    });
  });

  describe("deleteTrip", () => {
    it("should delete a trip document", async () => {
      mockStorage.deleteDoc.mockResolvedValue(undefined);

      await manager.deleteTrip("trip-1");

      expect(mockStorage.deleteDoc).toHaveBeenCalledWith("trip-1");
    });
  });

  describe("tripExists", () => {
    it("should return true if trip exists", async () => {
      mockStorage.docExists.mockResolvedValue(true);

      const exists = await manager.tripExists("trip-1");

      expect(exists).toBe(true);
      expect(mockStorage.docExists).toHaveBeenCalledWith("trip-1");
    });

    it("should return false if trip does not exist", async () => {
      mockStorage.docExists.mockResolvedValue(false);

      const exists = await manager.tripExists("trip-nonexistent");

      expect(exists).toBe(false);
    });
  });
});
