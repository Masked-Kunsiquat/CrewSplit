/**
 * AUTOMERGE MODULE - Integration Tests
 * QA + TESTING ENGINEER: End-to-end integration tests
 *
 * Tests the complete flow from service → repository → filesystem
 * Uses in-memory mock for expo-file-system
 */

import * as Automerge from "@automerge/automerge";
import { AutomergeManager } from "../service/AutomergeManager";
import type { TripAutomergeDoc } from "../types";

// Mock expo-file-system
const mockFileSystem: Record<string, string> = {};

jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///mock/",
  getInfoAsync: jest.fn((path: string) => {
    return Promise.resolve({ exists: path in mockFileSystem });
  }),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  writeAsStringAsync: jest.fn((path: string, content: string) => {
    mockFileSystem[path] = content;
    return Promise.resolve();
  }),
  readAsStringAsync: jest.fn((path: string) => {
    if (!(path in mockFileSystem)) {
      return Promise.reject(new Error("File not found"));
    }
    return Promise.resolve(mockFileSystem[path]);
  }),
  deleteAsync: jest.fn((path: string) => {
    delete mockFileSystem[path];
    return Promise.resolve();
  }),
  readDirectoryAsync: jest.fn(() => {
    return Promise.resolve(Object.keys(mockFileSystem));
  }),
  EncodingType: {
    Base64: "base64",
  },
}));

describe("Automerge Integration", () => {
  let manager: AutomergeManager;

  beforeEach(() => {
    // Clear mock filesystem
    Object.keys(mockFileSystem).forEach((key) => delete mockFileSystem[key]);

    // Create manager with default (real) storage
    manager = new AutomergeManager();
  });

  describe("End-to-end trip lifecycle", () => {
    it("should create, save, and load a trip document", async () => {
      // 1. Create a new trip
      const doc = await manager.createTrip({
        id: "trip-integration-1",
        name: "Integration Test Trip",
        emoji: "🧪",
        currency: "USD",
        startDate: "2024-01-01",
        endDate: null,
      });

      expect(doc.id).toBe("trip-integration-1");
      expect(doc.name).toBe("Integration Test Trip");

      // 2. Load the trip from filesystem
      const loadedDoc = await manager.loadTrip("trip-integration-1");

      expect(loadedDoc).not.toBeNull();
      expect(loadedDoc?.id).toBe("trip-integration-1");
      expect(loadedDoc?.name).toBe("Integration Test Trip");
    });

    it("should handle full CRUD operations on participants", async () => {
      // Create trip
      await manager.createTrip({
        id: "trip-participants",
        name: "Participants Test",
        emoji: "👥",
        currency: "EUR",
        startDate: "2024-01-01",
        endDate: null,
      });

      // Add participant
      const withParticipant = await manager.addParticipant("trip-participants", {
        id: "p1",
        name: "Alice",
        color: "#FF5733",
      });

      expect(withParticipant.participants["p1"]).toBeDefined();
      expect(withParticipant.participants["p1"].name).toBe("Alice");

      // Update participant
      const updatedParticipant = await manager.updateParticipantData(
        "trip-participants",
        "p1",
        {
          name: "Alice Smith",
          color: "#00FF00",
        },
      );

      expect(updatedParticipant.participants["p1"].name).toBe("Alice Smith");
      expect(updatedParticipant.participants["p1"].color).toBe("#00FF00");

      // Load from filesystem to verify persistence
      const reloaded = await manager.loadTrip("trip-participants");
      expect(reloaded?.participants["p1"].name).toBe("Alice Smith");

      // Remove participant
      const withoutParticipant = await manager.removeParticipant(
        "trip-participants",
        "p1",
      );

      expect(withoutParticipant.participants["p1"]).toBeUndefined();

      // Verify removal persisted
      const reloadedAfterDelete = await manager.loadTrip("trip-participants");
      expect(reloadedAfterDelete?.participants["p1"]).toBeUndefined();
    });

    it("should handle full CRUD operations on expenses", async () => {
      // Create trip with participant
      await manager.createTrip({
        id: "trip-expenses",
        name: "Expenses Test",
        emoji: "💰",
        currency: "USD",
        startDate: "2024-01-01",
        endDate: null,
      });

      await manager.addParticipant("trip-expenses", {
        id: "p1",
        name: "Bob",
        color: "#0000FF",
      });

      // Add expense
      const withExpense = await manager.addExpense("trip-expenses", {
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

      expect(withExpense.expenses["e1"]).toBeDefined();
      expect(withExpense.expenses["e1"].description).toBe("Dinner");

      // Update expense
      const updatedExpense = await manager.updateExpenseData(
        "trip-expenses",
        "e1",
        {
          description: "Lunch",
          originalAmountMinor: 3000,
          convertedAmountMinor: 3000,
        },
      );

      expect(updatedExpense.expenses["e1"].description).toBe("Lunch");
      expect(updatedExpense.expenses["e1"].originalAmountMinor).toBe(3000);

      // Load from filesystem to verify persistence
      const reloaded = await manager.loadTrip("trip-expenses");
      expect(reloaded?.expenses["e1"].description).toBe("Lunch");

      // Remove expense
      const withoutExpense = await manager.removeExpense("trip-expenses", "e1");

      expect(withoutExpense.expenses["e1"]).toBeUndefined();

      // Verify removal persisted
      const reloadedAfterDelete = await manager.loadTrip("trip-expenses");
      expect(reloadedAfterDelete?.expenses["e1"]).toBeUndefined();
    });

    it("should handle settlements", async () => {
      // Create trip with participants
      await manager.createTrip({
        id: "trip-settlements",
        name: "Settlements Test",
        emoji: "💸",
        currency: "USD",
        startDate: "2024-01-01",
        endDate: null,
      });

      await manager.addParticipant("trip-settlements", {
        id: "p1",
        name: "Alice",
        color: "#FF5733",
      });

      await manager.addParticipant("trip-settlements", {
        id: "p2",
        name: "Bob",
        color: "#33FF57",
      });

      // Add settlement
      const withSettlement = await manager.addSettlement("trip-settlements", {
        id: "s1",
        fromParticipantId: "p2",
        toParticipantId: "p1",
        originalAmountMinor: 2500,
        originalCurrency: "USD",
        convertedAmountMinor: 2500,
        fxRateToTrip: null,
        date: "2024-01-01",
        description: "Payment for dinner",
        paymentMethod: "venmo",
        expenseSplitId: null,
      });

      expect(withSettlement.settlements["s1"]).toBeDefined();
      expect(withSettlement.settlements["s1"].fromParticipantId).toBe("p2");
      expect(withSettlement.settlements["s1"].toParticipantId).toBe("p1");

      // Verify persistence
      const reloaded = await manager.loadTrip("trip-settlements");
      expect(reloaded?.settlements["s1"]).toBeDefined();
    });

    it("should handle complex trip with multiple entities", async () => {
      // Create trip
      await manager.createTrip({
        id: "trip-complex",
        name: "Complex Trip",
        emoji: "🌍",
        currency: "EUR",
        startDate: "2024-01-01",
        endDate: "2024-01-10",
      });

      // Add multiple participants
      await manager.addParticipant("trip-complex", {
        id: "p1",
        name: "Alice",
        color: "#FF5733",
      });

      await manager.addParticipant("trip-complex", {
        id: "p2",
        name: "Bob",
        color: "#33FF57",
      });

      await manager.addParticipant("trip-complex", {
        id: "p3",
        name: "Charlie",
        color: "#3357FF",
      });

      // Add multiple expenses
      await manager.addExpense("trip-complex", {
        id: "e1",
        description: "Hotel",
        originalAmountMinor: 15000,
        originalCurrency: "EUR",
        convertedAmountMinor: 15000,
        fxRateToTrip: null,
        categoryId: null,
        paidById: "p1",
        date: "2024-01-01",
        splits: {
          p1: { shareType: "equal", shareValue: 1 },
          p2: { shareType: "equal", shareValue: 1 },
          p3: { shareType: "equal", shareValue: 1 },
        },
      });

      await manager.addExpense("trip-complex", {
        id: "e2",
        description: "Dinner",
        originalAmountMinor: 6000,
        originalCurrency: "EUR",
        convertedAmountMinor: 6000,
        fxRateToTrip: null,
        categoryId: null,
        paidById: "p2",
        date: "2024-01-02",
        splits: {
          p1: { shareType: "percentage", shareValue: 50 },
          p2: { shareType: "percentage", shareValue: 50 },
        },
      });

      // Load and verify
      const loaded = await manager.loadTrip("trip-complex");

      expect(loaded).not.toBeNull();
      expect(Object.keys(loaded!.participants)).toHaveLength(3);
      expect(Object.keys(loaded!.expenses)).toHaveLength(2);

      // Verify data integrity
      expect(loaded!.participants["p1"].name).toBe("Alice");
      expect(loaded!.participants["p2"].name).toBe("Bob");
      expect(loaded!.participants["p3"].name).toBe("Charlie");
      expect(loaded!.expenses["e1"].description).toBe("Hotel");
      expect(loaded!.expenses["e2"].description).toBe("Dinner");
    });

    it("should handle trip deletion", async () => {
      // Create trip
      await manager.createTrip({
        id: "trip-delete",
        name: "Delete Test",
        emoji: "🗑️",
        currency: "USD",
        startDate: "2024-01-01",
        endDate: null,
      });

      // Verify it exists
      const exists = await manager.tripExists("trip-delete");
      expect(exists).toBe(true);

      // Delete trip
      await manager.deleteTrip("trip-delete");

      // Verify it no longer exists
      const existsAfterDelete = await manager.tripExists("trip-delete");
      expect(existsAfterDelete).toBe(false);

      // Try to load deleted trip
      const loaded = await manager.loadTrip("trip-delete");
      expect(loaded).toBeNull();
    });
  });

  describe("Automerge CRDT properties", () => {
    it("should preserve document history", async () => {
      // Create trip
      const doc1 = await manager.createTrip({
        id: "trip-history",
        name: "History Test",
        emoji: "📜",
        currency: "USD",
        startDate: "2024-01-01",
        endDate: null,
      });

      // Make several changes
      await manager.updateTrip("trip-history", { name: "Updated Name 1" });
      await manager.updateTrip("trip-history", { name: "Updated Name 2" });
      await manager.addParticipant("trip-history", {
        id: "p1",
        name: "Alice",
        color: "#FF5733",
      });

      // Load final document
      const finalDoc = await manager.loadTrip("trip-history");

      expect(finalDoc).not.toBeNull();
      expect(finalDoc!.name).toBe("Updated Name 2");
      expect(finalDoc!.participants["p1"]).toBeDefined();

      // Get history
      const history = Automerge.getHistory(finalDoc!);

      // Should have multiple changes
      expect(history.length).toBeGreaterThan(1);
    });

    it("should be deterministic (same operations produce same document)", async () => {
      // Create two identical trips
      const doc1 = await manager.createTrip({
        id: "trip-determinism-1",
        name: "Determinism Test",
        emoji: "🔁",
        currency: "USD",
        startDate: "2024-01-01",
        endDate: null,
      });

      const doc2 = await manager.createTrip({
        id: "trip-determinism-2",
        name: "Determinism Test",
        emoji: "🔁",
        currency: "USD",
        startDate: "2024-01-01",
        endDate: null,
      });

      // Both should have the same structure (ignoring timestamps)
      expect(doc1.name).toBe(doc2.name);
      expect(doc1.emoji).toBe(doc2.emoji);
      expect(doc1.currency).toBe(doc2.currency);
      expect(Object.keys(doc1.participants)).toHaveLength(0);
      expect(Object.keys(doc2.participants)).toHaveLength(0);
    });
  });
});
