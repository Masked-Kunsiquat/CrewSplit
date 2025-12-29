/**
 * AUTOMERGE MODULE - Document Operations Tests
 * QA + TESTING ENGINEER: Unit tests for pure engine functions
 *
 * Tests the pure functions in doc-operations.ts
 * All functions should be deterministic (same inputs → same outputs)
 */

import {
  createEmptyTripDoc,
  updateTripMetadata,
  createParticipant,
  updateParticipant,
  createExpense,
  updateExpense,
  createSettlement,
  updateSettlement,
  validateTripDoc,
} from "../engine/doc-operations";
import { CURRENT_SCHEMA_VERSION } from "../engine/doc-schema";

describe("doc-operations", () => {
  describe("createEmptyTripDoc", () => {
    it("should create a valid empty trip document", () => {
      const doc = createEmptyTripDoc({
        id: "trip-1",
        name: "Paris Trip",
        emoji: "🗼",
        currency: "EUR",
        startDate: "2024-01-01",
        endDate: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(doc.id).toBe("trip-1");
      expect(doc.name).toBe("Paris Trip");
      expect(doc.emoji).toBe("🗼");
      expect(doc.currency).toBe("EUR");
      expect(doc.startDate).toBe("2024-01-01");
      expect(doc.endDate).toBeNull();
      expect(doc.participants).toEqual({});
      expect(doc.expenses).toEqual({});
      expect(doc.settlements).toEqual({});
      expect(doc._metadata.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(doc._metadata.lastSyncedAt).toBeNull();
    });

    it("should handle trip with end date", () => {
      const doc = createEmptyTripDoc({
        id: "trip-2",
        name: "Tokyo Trip",
        emoji: "🗾",
        currency: "JPY",
        startDate: "2024-01-01",
        endDate: "2024-01-10",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(doc.endDate).toBe("2024-01-10");
    });
  });

  describe("updateTripMetadata", () => {
    it("should return fields to update with updatedAt", () => {
      const updates = updateTripMetadata({
        name: "New Trip Name",
        emoji: "🎉",
      });

      expect(updates.name).toBe("New Trip Name");
      expect(updates.emoji).toBe("🎉");
      expect(updates.updatedAt).toBeDefined();
      expect(typeof updates.updatedAt).toBe("string");
    });

    it("should handle single field update", () => {
      const updates = updateTripMetadata({
        currency: "USD",
      });

      expect(updates.currency).toBe("USD");
      expect(updates.updatedAt).toBeDefined();
    });

    it("should handle all fields update", () => {
      const updates = updateTripMetadata({
        name: "Updated Name",
        emoji: "✈️",
        currency: "GBP",
        startDate: "2024-02-01",
        endDate: "2024-02-15",
      });

      expect(updates.name).toBe("Updated Name");
      expect(updates.emoji).toBe("✈️");
      expect(updates.currency).toBe("GBP");
      expect(updates.startDate).toBe("2024-02-01");
      expect(updates.endDate).toBe("2024-02-15");
    });
  });

  describe("createParticipant", () => {
    it("should create a valid participant", () => {
      const participant = createParticipant({
        id: "p1",
        name: "Alice",
        color: "#FF5733",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(participant.id).toBe("p1");
      expect(participant.name).toBe("Alice");
      expect(participant.color).toBe("#FF5733");
      expect(participant.createdAt).toBe("2024-01-01T00:00:00Z");
      expect(participant.updatedAt).toBe("2024-01-01T00:00:00Z");
    });
  });

  describe("updateParticipant", () => {
    it("should return fields to update with updatedAt", () => {
      const updates = updateParticipant({
        name: "Alice Smith",
      });

      expect(updates.name).toBe("Alice Smith");
      expect(updates.updatedAt).toBeDefined();
    });

    it("should handle color update", () => {
      const updates = updateParticipant({
        color: "#00FF00",
      });

      expect(updates.color).toBe("#00FF00");
      expect(updates.updatedAt).toBeDefined();
    });

    it("should handle both fields", () => {
      const updates = updateParticipant({
        name: "Bob",
        color: "#0000FF",
      });

      expect(updates.name).toBe("Bob");
      expect(updates.color).toBe("#0000FF");
    });
  });

  describe("createExpense", () => {
    it("should create a valid expense with splits", () => {
      const expense = createExpense({
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
          p2: { shareType: "equal", shareValue: 1 },
        },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(expense.id).toBe("e1");
      expect(expense.description).toBe("Dinner");
      expect(expense.originalAmountMinor).toBe(5000);
      expect(expense.originalCurrency).toBe("USD");
      expect(expense.convertedAmountMinor).toBe(5000);
      expect(expense.fxRateToTrip).toBeNull();
      expect(expense.categoryId).toBeNull();
      expect(expense.paidById).toBe("p1");
      expect(expense.date).toBe("2024-01-01");
      expect(expense.splits).toEqual({
        p1: { shareType: "equal", shareValue: 1 },
        p2: { shareType: "equal", shareValue: 1 },
      });
    });

    it("should handle expense with currency conversion", () => {
      const expense = createExpense({
        id: "e2",
        description: "Hotel",
        originalAmountMinor: 10000,
        originalCurrency: "EUR",
        convertedAmountMinor: 11000,
        fxRateToTrip: 1.1,
        categoryId: "cat-1",
        paidById: "p2",
        date: "2024-01-02",
        splits: {
          p1: { shareType: "percentage", shareValue: 50 },
          p2: { shareType: "percentage", shareValue: 50 },
        },
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      });

      expect(expense.fxRateToTrip).toBe(1.1);
      expect(expense.convertedAmountMinor).toBe(11000);
      expect(expense.categoryId).toBe("cat-1");
    });
  });

  describe("updateExpense", () => {
    it("should return fields to update with updatedAt", () => {
      const updates = updateExpense({
        description: "Lunch",
        originalAmountMinor: 3000,
      });

      expect(updates.description).toBe("Lunch");
      expect(updates.originalAmountMinor).toBe(3000);
      expect(updates.updatedAt).toBeDefined();
    });

    it("should handle splits update", () => {
      const updates = updateExpense({
        splits: {
          p1: { shareType: "exact_amount", shareValue: 2000 },
          p2: { shareType: "exact_amount", shareValue: 3000 },
        },
      });

      expect(updates.splits).toEqual({
        p1: { shareType: "exact_amount", shareValue: 2000 },
        p2: { shareType: "exact_amount", shareValue: 3000 },
      });
    });
  });

  describe("createSettlement", () => {
    it("should create a valid settlement", () => {
      const settlement = createSettlement({
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
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(settlement.id).toBe("s1");
      expect(settlement.fromParticipantId).toBe("p2");
      expect(settlement.toParticipantId).toBe("p1");
      expect(settlement.originalAmountMinor).toBe(2500);
      expect(settlement.originalCurrency).toBe("USD");
      expect(settlement.convertedAmountMinor).toBe(2500);
      expect(settlement.fxRateToTrip).toBeNull();
      expect(settlement.date).toBe("2024-01-01");
      expect(settlement.description).toBe("Payment for dinner");
      expect(settlement.paymentMethod).toBe("venmo");
      expect(settlement.expenseSplitId).toBeNull();
    });

    it("should handle settlement with currency conversion", () => {
      const settlement = createSettlement({
        id: "s2",
        fromParticipantId: "p1",
        toParticipantId: "p2",
        originalAmountMinor: 5000,
        originalCurrency: "EUR",
        convertedAmountMinor: 5500,
        fxRateToTrip: 1.1,
        date: "2024-01-02",
        description: null,
        paymentMethod: "cash",
        expenseSplitId: "es-1",
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      });

      expect(settlement.fxRateToTrip).toBe(1.1);
      expect(settlement.convertedAmountMinor).toBe(5500);
      expect(settlement.expenseSplitId).toBe("es-1");
    });
  });

  describe("updateSettlement", () => {
    it("should return fields to update with updatedAt", () => {
      const updates = updateSettlement({
        description: "Updated payment",
        paymentMethod: "cash",
      });

      expect(updates.description).toBe("Updated payment");
      expect(updates.paymentMethod).toBe("cash");
      expect(updates.updatedAt).toBeDefined();
    });

    it("should handle amount update", () => {
      const updates = updateSettlement({
        originalAmountMinor: 3000,
        convertedAmountMinor: 3300,
        fxRateToTrip: 1.1,
      });

      expect(updates.originalAmountMinor).toBe(3000);
      expect(updates.convertedAmountMinor).toBe(3300);
      expect(updates.fxRateToTrip).toBe(1.1);
    });
  });

  describe("validateTripDoc", () => {
    it("should validate a valid trip document", () => {
      const doc = createEmptyTripDoc({
        id: "trip-1",
        name: "Test Trip",
        emoji: "🌍",
        currency: "USD",
        startDate: "2024-01-01",
        endDate: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      expect(() => validateTripDoc(doc)).not.toThrow();
      expect(validateTripDoc(doc)).toBe(true);
    });

    it("should throw if document is missing id", () => {
      const doc = {
        name: "Test",
        currency: "USD",
        participants: {},
        expenses: {},
        settlements: {},
        _metadata: { schemaVersion: 1, lastSyncedAt: null },
      };

      expect(() => validateTripDoc(doc)).toThrow("missing or invalid id");
    });

    it("should throw if document is missing name", () => {
      const doc = {
        id: "trip-1",
        currency: "USD",
        participants: {},
        expenses: {},
        settlements: {},
        _metadata: { schemaVersion: 1, lastSyncedAt: null },
      };

      expect(() => validateTripDoc(doc)).toThrow("missing or invalid name");
    });

    it("should throw if document is missing currency", () => {
      const doc = {
        id: "trip-1",
        name: "Test",
        participants: {},
        expenses: {},
        settlements: {},
        _metadata: { schemaVersion: 1, lastSyncedAt: null },
      };

      expect(() => validateTripDoc(doc)).toThrow("missing or invalid currency");
    });

    it("should throw if document is missing _metadata", () => {
      const doc = {
        id: "trip-1",
        name: "Test",
        currency: "USD",
        participants: {},
        expenses: {},
        settlements: {},
      };

      expect(() => validateTripDoc(doc)).toThrow("missing _metadata");
    });

    it("should throw if document is missing schemaVersion", () => {
      const doc = {
        id: "trip-1",
        name: "Test",
        currency: "USD",
        participants: {},
        expenses: {},
        settlements: {},
        _metadata: { lastSyncedAt: null },
      };

      expect(() => validateTripDoc(doc)).toThrow("missing or invalid schema version");
    });

    it("should throw if document is missing collections", () => {
      const doc = {
        id: "trip-1",
        name: "Test",
        currency: "USD",
        _metadata: { schemaVersion: 1, lastSyncedAt: null },
      };

      expect(() => validateTripDoc(doc)).toThrow("missing participants collection");
    });
  });
});
