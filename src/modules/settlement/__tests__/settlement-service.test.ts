/**
 * SETTLEMENT SERVICE INTEGRATION TESTS
 * Settlement Integration Engineer: Verify service connects algorithms to data layer
 */

(global as any).__DEV__ = false;

import { computeSettlement } from "../service/SettlementService";
import {
  getExpensesForTrip,
  getExpenseSplits,
} from "../../expenses/repository";
import { getParticipantsForTrip } from "../../participants/repository";

jest.mock("@utils/logger", () => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { settlementLogger: logger };
});

jest.mock("../../expenses/repository", () => ({
  getExpensesForTrip: jest.fn(),
  getExpenseSplits: jest.fn(),
}));

jest.mock("../../participants/repository", () => ({
  getParticipantsForTrip: jest.fn(),
}));

describe("SettlementService", () => {
  /**
   * Clean up all test data after each test to ensure isolation
   */
  afterEach(async () => {
    jest.resetAllMocks();
  });

  const setTripData = ({
    participants = [],
    expenses = [],
    splits = {},
  }: {
    participants?: any[];
    expenses?: any[];
    splits?: Record<string, any[]>;
  }) => {
    (getParticipantsForTrip as jest.Mock).mockResolvedValue(participants);
    (getExpensesForTrip as jest.Mock).mockResolvedValue(expenses);
    (getExpenseSplits as jest.Mock).mockImplementation((expenseId: string) =>
      Promise.resolve(splits[expenseId] ?? []),
    );
  };

  describe("computeSettlement", () => {
    it("should compute settlement for a trip with expenses", async () => {
      const tripId = "trip-1";
      const aliceId = "alice";
      const bobId = "bob";
      const expenseId = "expense-1";
      const now = "2024-01-01T00:00:00.000Z";

      setTripData({
        participants: [
          { id: aliceId, tripId, name: "Alice", createdAt: now },
          { id: bobId, tripId, name: "Bob", createdAt: now },
        ],
        expenses: [
          {
            id: expenseId,
            tripId,
            description: "Dinner",
            amount: 3000,
            currency: "USD",
            originalCurrency: "USD",
            originalAmountMinor: 3000,
            fxRateToTrip: null,
            convertedAmountMinor: 3000,
            paidBy: aliceId,
            date: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
        splits: {
          [expenseId]: [
            {
              id: "split-1",
              expenseId,
              participantId: aliceId,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "split-2",
              expenseId,
              participantId: bobId,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      });

      const settlement = await computeSettlement(tripId);

      expect(settlement.currency).toBe("USD");
      expect(settlement.totalExpenses).toBe(3000);
      expect(settlement.balances).toHaveLength(2);

      const aliceBalance = settlement.balances.find(
        (b) => b.participantId === aliceId,
      );
      expect(aliceBalance).toBeDefined();
      expect(aliceBalance!.totalPaid).toBe(3000);
      expect(aliceBalance!.totalOwed).toBe(1500);
      expect(aliceBalance!.netPosition).toBe(1500);

      const bobBalance = settlement.balances.find(
        (b) => b.participantId === bobId,
      );
      expect(bobBalance).toBeDefined();
      expect(bobBalance!.totalPaid).toBe(0);
      expect(bobBalance!.totalOwed).toBe(1500);
      expect(bobBalance!.netPosition).toBe(-1500);

      expect(settlement.settlements).toHaveLength(1);
      expect(settlement.settlements[0]).toEqual({
        from: bobId,
        fromName: "Bob",
        to: aliceId,
        toName: "Alice",
        amount: 1500,
      });
    });

    it("should handle multi-currency expenses using convertedAmountMinor", async () => {
      const tripId = "trip-2";
      const charlieId = "charlie";
      const danaId = "dana";
      const expenseId = "expense-2";
      const now = "2024-02-01T00:00:00.000Z";

      setTripData({
        participants: [
          { id: charlieId, tripId, name: "Charlie", createdAt: now },
          { id: danaId, tripId, name: "Dana", createdAt: now },
        ],
        expenses: [
          {
            id: expenseId,
            tripId,
            description: "Hotel",
            amount: 9200,
            currency: "EUR",
            originalCurrency: "USD",
            originalAmountMinor: 10000,
            fxRateToTrip: 0.92,
            convertedAmountMinor: 9200,
            paidBy: charlieId,
            date: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
        splits: {
          [expenseId]: [
            {
              id: "split-3",
              expenseId,
              participantId: charlieId,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "split-4",
              expenseId,
              participantId: danaId,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      });

      const settlement = await computeSettlement(tripId);

      expect(settlement.currency).toBe("EUR");
      expect(settlement.totalExpenses).toBe(9200);
      expect(settlement.balances).toHaveLength(2);

      const charlieBalance = settlement.balances.find(
        (b) => b.participantId === charlieId,
      )!;
      expect(charlieBalance.participantId).toBe(charlieId);
      expect(charlieBalance.totalPaid).toBe(9200);
      expect(charlieBalance.totalOwed).toBe(4600);
      expect(charlieBalance.netPosition).toBe(4600);

      const danaBalance = settlement.balances.find(
        (b) => b.participantId === danaId,
      )!;
      expect(danaBalance.totalPaid).toBe(0);
      expect(danaBalance.totalOwed).toBe(4600);
      expect(danaBalance.netPosition).toBe(-4600);
      expect(settlement.settlements).toHaveLength(1);
    });

    it("should handle trips with no expenses", async () => {
      const tripId = "trip-empty";
      setTripData({
        participants: [{ id: "p1", tripId, name: "Dave", createdAt: "now" }],
        expenses: [],
        splits: {},
      });

      const settlement = await computeSettlement(tripId);

      expect(settlement.currency).toBe("USD");
      expect(settlement.totalExpenses).toBe(0);
      expect(settlement.balances).toEqual([]);
      expect(settlement.settlements).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("should handle weighted-share splits correctly", async () => {
      const tripId = "weighted-trip";
      const now = "2024-03-01T00:00:00.000Z";
      const aliceId = "alice-weight";
      const bobId = "bob-weight";
      const expenseId = "expense-weight";

      setTripData({
        participants: [
          { id: aliceId, tripId, name: "Alice", createdAt: now },
          { id: bobId, tripId, name: "Bob", createdAt: now },
        ],
        expenses: [
          {
            id: expenseId,
            tripId,
            description: "Weighted Expense",
            amount: 9000,
            currency: "USD",
            originalCurrency: "USD",
            originalAmountMinor: 9000,
            fxRateToTrip: null,
            convertedAmountMinor: 9000,
            paidBy: aliceId,
            date: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
        splits: {
          [expenseId]: [
            {
              id: "split-w1",
              expenseId,
              participantId: aliceId,
              share: 2,
              shareType: "weight",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "split-w2",
              expenseId,
              participantId: bobId,
              share: 1,
              shareType: "weight",
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      });

      // Compute settlement
      const settlement = await computeSettlement(tripId);

      // Verify results
      expect(settlement.currency).toBe("USD");
      expect(settlement.totalExpenses).toBe(9000);
      expect(settlement.balances).toHaveLength(2);

      // Alice: paid $90, owes $60 (2/3 of $90) → net +$30
      const aliceBalance = settlement.balances.find(
        (b) => b.participantId === aliceId,
      );
      expect(aliceBalance).toBeDefined();
      expect(aliceBalance!.totalPaid).toBe(9000);
      expect(aliceBalance!.totalOwed).toBe(6000); // 2/3 of 9000
      expect(aliceBalance!.netPosition).toBe(3000); // +$30

      // Bob: paid $0, owes $30 (1/3 of $90) → net -$30
      const bobBalance = settlement.balances.find(
        (b) => b.participantId === bobId,
      );
      expect(bobBalance).toBeDefined();
      expect(bobBalance!.totalPaid).toBe(0);
      expect(bobBalance!.totalOwed).toBe(3000); // 1/3 of 9000
      expect(bobBalance!.netPosition).toBe(-3000); // -$30

      // Settlement: Bob pays Alice $30
      expect(settlement.settlements).toHaveLength(1);
      expect(settlement.settlements[0]).toEqual({
        from: bobId,
        fromName: "Bob",
        to: aliceId,
        toName: "Alice",
        amount: 3000,
      });
    });

    it("should handle excluded participants correctly", async () => {
      const tripId = "excluded-trip";
      const now = "2024-04-01T00:00:00.000Z";
      const aliceId = "alice-ex";
      const bobId = "bob-ex";
      const charlieId = "charlie-ex";
      const expenseId = "expense-ex";

      setTripData({
        participants: [
          { id: aliceId, tripId, name: "Alice", createdAt: now },
          { id: bobId, tripId, name: "Bob", createdAt: now },
          { id: charlieId, tripId, name: "Charlie", createdAt: now },
        ],
        expenses: [
          {
            id: expenseId,
            tripId,
            description: "Lunch for Alice and Bob",
            amount: 6000,
            currency: "USD",
            originalCurrency: "USD",
            originalAmountMinor: 6000,
            fxRateToTrip: null,
            convertedAmountMinor: 6000,
            paidBy: aliceId,
            date: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
        splits: {
          [expenseId]: [
            {
              id: "split-ex1",
              expenseId,
              participantId: aliceId,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "split-ex2",
              expenseId,
              participantId: bobId,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      });

      // Compute settlement
      const settlement = await computeSettlement(tripId);

      // Verify results
      expect(settlement.balances).toHaveLength(3);

      // Alice: paid $60, owes $30 → net +$30
      const aliceBalance = settlement.balances.find(
        (b) => b.participantId === aliceId,
      );
      expect(aliceBalance!.totalPaid).toBe(6000);
      expect(aliceBalance!.totalOwed).toBe(3000);
      expect(aliceBalance!.netPosition).toBe(3000);

      // Bob: paid $0, owes $30 → net -$30
      const bobBalance = settlement.balances.find(
        (b) => b.participantId === bobId,
      );
      expect(bobBalance!.totalPaid).toBe(0);
      expect(bobBalance!.totalOwed).toBe(3000);
      expect(bobBalance!.netPosition).toBe(-3000);

      // Charlie: paid $0, owes $0 → net $0 (excluded from expense)
      const charlieBalance = settlement.balances.find(
        (b) => b.participantId === charlieId,
      );
      expect(charlieBalance).toBeDefined();
      expect(charlieBalance!.totalPaid).toBe(0);
      expect(charlieBalance!.totalOwed).toBe(0);
      expect(charlieBalance!.netPosition).toBe(0);

      // Settlement: Bob pays Alice $30 (Charlie not involved)
      expect(settlement.settlements).toHaveLength(1);
      expect(settlement.settlements[0]).toEqual({
        from: bobId,
        fromName: "Bob",
        to: aliceId,
        toName: "Alice",
        amount: 3000,
      });
    });

    it("should handle zero-value splits correctly", async () => {
      const tripId = "zero-share-trip";
      const now = "2024-05-01T00:00:00.000Z";
      const aliceId = "alice-zero";
      const bobId = "bob-zero";
      const charlieId = "charlie-zero";
      const expenseId = "expense-zero";

      setTripData({
        participants: [
          { id: aliceId, tripId, name: "Alice", createdAt: now },
          { id: bobId, tripId, name: "Bob", createdAt: now },
          { id: charlieId, tripId, name: "Charlie", createdAt: now },
        ],
        expenses: [
          {
            id: expenseId,
            tripId,
            description: "Expense with zero share",
            amount: 8000,
            currency: "USD",
            originalCurrency: "USD",
            originalAmountMinor: 8000,
            fxRateToTrip: null,
            convertedAmountMinor: 8000,
            paidBy: aliceId,
            date: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
        splits: {
          [expenseId]: [
            {
              id: "split-z1",
              expenseId,
              participantId: aliceId,
              share: 3,
              shareType: "weight",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "split-z2",
              expenseId,
              participantId: bobId,
              share: 1,
              shareType: "weight",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "split-z3",
              expenseId,
              participantId: charlieId,
              share: 0,
              shareType: "weight",
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      });

      // Compute settlement
      const settlement = await computeSettlement(tripId);

      // Verify results
      expect(settlement.balances).toHaveLength(3);

      // Alice: paid $80, owes $60 (3/4 of $80) → net +$20
      const aliceBalance = settlement.balances.find(
        (b) => b.participantId === aliceId,
      );
      expect(aliceBalance!.totalPaid).toBe(8000);
      expect(aliceBalance!.totalOwed).toBe(6000); // 3/4 of 8000
      expect(aliceBalance!.netPosition).toBe(2000);

      // Bob: paid $0, owes $20 (1/4 of $80) → net -$20
      const bobBalance = settlement.balances.find(
        (b) => b.participantId === bobId,
      );
      expect(bobBalance!.totalPaid).toBe(0);
      expect(bobBalance!.totalOwed).toBe(2000); // 1/4 of 8000
      expect(bobBalance!.netPosition).toBe(-2000);

      // Charlie: paid $0, owes $0 (0/4 of $80) → net $0
      const charlieBalance = settlement.balances.find(
        (b) => b.participantId === charlieId,
      );
      expect(charlieBalance).toBeDefined();
      expect(charlieBalance!.totalPaid).toBe(0);
      expect(charlieBalance!.totalOwed).toBe(0); // 0/4 of 8000
      expect(charlieBalance!.netPosition).toBe(0);

      // Settlement: Bob pays Alice $20
      expect(settlement.settlements).toHaveLength(1);
      expect(settlement.settlements[0]).toEqual({
        from: bobId,
        fromName: "Bob",
        to: aliceId,
        toName: "Alice",
        amount: 2000,
      });
    });

    it("should handle expense referencing non-existent participant", async () => {
      const tripId = "invalid-participant-trip";
      const now = "2024-06-01T00:00:00.000Z";
      const aliceId = "alice-invalid";
      const expenseId = "expense-invalid";
      const nonExistentId = "ghost";

      setTripData({
        participants: [{ id: aliceId, tripId, name: "Alice", createdAt: now }],
        expenses: [
          {
            id: expenseId,
            tripId,
            description: "Expense with invalid participant",
            amount: 5000,
            currency: "USD",
            originalCurrency: "USD",
            originalAmountMinor: 5000,
            fxRateToTrip: null,
            convertedAmountMinor: 5000,
            paidBy: aliceId,
            date: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
        splits: {
          [expenseId]: [
            {
              id: "split-i1",
              expenseId,
              participantId: aliceId,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "split-i2",
              expenseId,
              participantId: nonExistentId,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      });

      // Compute settlement - should throw structured error for invalid participant ID
      await expect(computeSettlement(tripId)).rejects.toThrow(
        `Invalid participant IDs found in expense splits: ${nonExistentId}`,
      );

      // Verify the error has the correct structure
      try {
        await computeSettlement(tripId);
        fail("Expected computeSettlement to throw");
      } catch (error: any) {
        expect(error.code).toBe("INVALID_PARTICIPANT_IDS");
        expect(error.invalidParticipantIds).toBeDefined();
        expect(error.invalidParticipantIds).toContain(nonExistentId);
        expect(error.message).toContain(
          "Invalid participant IDs found in expense splits",
        );
      }
    });
  });

  describe("determinism", () => {
    it("should produce identical results for same data", async () => {
      const tripId = "deterministic-trip";
      const now = "2024-07-01T00:00:00.000Z";
      const p1 = "p1";
      const p2 = "p2";
      const p3 = "p3";
      const expense1Id = "det-exp-1";
      const expense2Id = "det-exp-2";

      setTripData({
        participants: [
          { id: p1, tripId, name: "P1", createdAt: now },
          { id: p2, tripId, name: "P2", createdAt: now },
          { id: p3, tripId, name: "P3", createdAt: now },
        ],
        expenses: [
          {
            id: expense1Id,
            tripId,
            description: "Expense 1",
            amount: 6000,
            currency: "USD",
            originalCurrency: "USD",
            originalAmountMinor: 6000,
            fxRateToTrip: null,
            convertedAmountMinor: 6000,
            paidBy: p1,
            date: now,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: expense2Id,
            tripId,
            description: "Expense 2",
            amount: 9000,
            currency: "USD",
            originalCurrency: "USD",
            originalAmountMinor: 9000,
            fxRateToTrip: null,
            convertedAmountMinor: 9000,
            paidBy: p2,
            date: now,
            createdAt: now,
            updatedAt: now,
          },
        ],
        splits: {
          [expense1Id]: [
            {
              id: "det-s1",
              expenseId: expense1Id,
              participantId: p1,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "det-s2",
              expenseId: expense1Id,
              participantId: p2,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "det-s3",
              expenseId: expense1Id,
              participantId: p3,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
          ],
          [expense2Id]: [
            {
              id: "det-s4",
              expenseId: expense2Id,
              participantId: p1,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "det-s5",
              expenseId: expense2Id,
              participantId: p2,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: "det-s6",
              expenseId: expense2Id,
              participantId: p3,
              share: 1,
              shareType: "equal",
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      });

      // Compute settlement multiple times
      const settlement1 = await computeSettlement(tripId);
      const settlement2 = await computeSettlement(tripId);
      const settlement3 = await computeSettlement(tripId);

      // Verify all three calls produce identical results
      expect(settlement1).toEqual(settlement2);
      expect(settlement2).toEqual(settlement3);

      const sortBalances = (balances: any[]) =>
        balances
          .slice()
          .sort((a, b) => a.participantId.localeCompare(b.participantId));
      const sortSettlements = (settlements: any[]) =>
        settlements.slice().sort((a, b) => {
          const fromCompare = a.from.localeCompare(b.from);
          if (fromCompare !== 0) return fromCompare;
          const toCompare = a.to.localeCompare(b.to);
          if (toCompare !== 0) return toCompare;
          return a.amount - b.amount;
        });

      const expectedBalances = sortBalances(settlement1.balances);
      const expectedSettlementOrder = sortSettlements(settlement1.settlements);

      expect(sortBalances(settlement1.balances)).toEqual(expectedBalances);
      expect(sortBalances(settlement2.balances)).toEqual(expectedBalances);
      expect(sortBalances(settlement3.balances)).toEqual(expectedBalances);

      expect(sortSettlements(settlement1.settlements)).toEqual(
        expectedSettlementOrder,
      );
      expect(sortSettlements(settlement2.settlements)).toEqual(
        expectedSettlementOrder,
      );
      expect(sortSettlements(settlement3.settlements)).toEqual(
        expectedSettlementOrder,
      );
    });
  });
});
