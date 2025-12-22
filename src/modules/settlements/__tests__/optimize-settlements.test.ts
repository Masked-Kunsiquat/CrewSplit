/**
 * SETTLEMENT MODULE - optimizeSettlements Tests
 * MODELER: Test greedy settlement optimization algorithm
 */

import { optimizeSettlements } from "../engine/optimize-settlements";
import { ParticipantBalance } from "../types";

describe("optimizeSettlements", () => {
  describe("simple cases", () => {
    it("should create single settlement when one creditor and one debtor", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 1000, // Alice is owed $10
          totalPaid: 1500,
          totalOwed: 500,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: -1000, // Bob owes $10
          totalPaid: 500,
          totalOwed: 1500,
        },
      ];

      const settlements = optimizeSettlements(balances);

      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        from: "bob",
        fromName: "Bob",
        to: "alice",
        toName: "Alice",
        amount: 1000,
      });
    });

    it("should handle perfectly balanced participants (no settlements needed)", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 0,
          totalPaid: 1000,
          totalOwed: 1000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: 0,
          totalPaid: 1000,
          totalOwed: 1000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      expect(settlements).toHaveLength(0);
    });

    it("should skip participants with zero net position", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 500,
          totalPaid: 1000,
          totalOwed: 500,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: 0, // Bob is settled
          totalPaid: 500,
          totalOwed: 500,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -500,
          totalPaid: 0,
          totalOwed: 500,
        },
      ];

      const settlements = optimizeSettlements(balances);

      expect(settlements).toHaveLength(1);
      expect(settlements[0]).toEqual({
        from: "charlie",
        fromName: "Charlie",
        to: "alice",
        toName: "Alice",
        amount: 500,
      });
    });
  });

  describe("three-person scenarios", () => {
    it("should minimize transactions with two debtors and one creditor", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 2000, // Alice is owed $20
          totalPaid: 3000,
          totalOwed: 1000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: -1000, // Bob owes $10
          totalPaid: 0,
          totalOwed: 1000,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -1000, // Charlie owes $10
          totalPaid: 0,
          totalOwed: 1000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      // Should create 2 settlements (one from each debtor to Alice)
      expect(settlements).toHaveLength(2);

      // Verify total settled amount
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(2000);

      // All settlements should go to Alice
      settlements.forEach((s) => {
        expect(s.to).toBe("alice");
        expect(s.amount).toBeGreaterThan(0);
      });
    });

    it("should minimize transactions with one debtor and two creditors", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 1000,
          totalPaid: 2000,
          totalOwed: 1000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: 1000,
          totalPaid: 2000,
          totalOwed: 1000,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -2000,
          totalPaid: 0,
          totalOwed: 2000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      // Should create 2 settlements (from Charlie to each creditor)
      expect(settlements).toHaveLength(2);

      // All settlements should come from Charlie
      settlements.forEach((s) => {
        expect(s.from).toBe("charlie");
        expect(s.amount).toBeGreaterThan(0);
      });

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(2000);
    });

    it("should handle complex three-person case", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 3000,
          totalPaid: 5000,
          totalOwed: 2000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: -1000,
          totalPaid: 1000,
          totalOwed: 2000,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -2000,
          totalPaid: 0,
          totalOwed: 2000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      // Greedy: largest creditor (Alice: 3000) with largest debtor (Charlie: -2000)
      // Settlement 1: Charlie -> Alice: 2000 (Alice now has 1000 left, Charlie settled)
      // Settlement 2: Bob -> Alice: 1000 (all settled)
      expect(settlements).toHaveLength(2);

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(3000);
    });
  });

  describe("larger group scenarios", () => {
    it("should handle four-person scenario", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 3000,
          totalPaid: 6000,
          totalOwed: 3000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: 1000,
          totalPaid: 4000,
          totalOwed: 3000,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -2000,
          totalPaid: 1000,
          totalOwed: 3000,
        },
        {
          participantId: "david",
          participantName: "David",
          netPosition: -2000,
          totalPaid: 1000,
          totalOwed: 3000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      // Should minimize to at most N-1 settlements (at most 3 for 4 people)
      expect(settlements.length).toBeLessThanOrEqual(3);

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(4000); // Sum of all positive net positions
    });

    it("should handle uneven amounts that require multiple partial settlements", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 5000, // Largest creditor
          totalPaid: 8000,
          totalOwed: 3000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: -1000,
          totalPaid: 2000,
          totalOwed: 3000,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -2000,
          totalPaid: 1000,
          totalOwed: 3000,
        },
        {
          participantId: "david",
          participantName: "David",
          netPosition: -2000,
          totalPaid: 1000,
          totalOwed: 3000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      // Greedy algorithm should match Alice (5000) with largest debtors first
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(5000);

      // All amounts should be positive
      settlements.forEach((s) => {
        expect(s.amount).toBeGreaterThan(0);
      });
    });
  });

  describe("no circular debts", () => {
    it("should never create circular payment chains", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 1000,
          totalPaid: 3000,
          totalOwed: 2000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: 1000,
          totalPaid: 3000,
          totalOwed: 2000,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -2000,
          totalPaid: 0,
          totalOwed: 2000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      // Check no one both pays and receives
      const payers = new Set(settlements.map((s) => s.from));
      const receivers = new Set(settlements.map((s) => s.to));

      // No participant should be in both sets
      payers.forEach((payer) => {
        expect(receivers.has(payer)).toBe(false);
      });
    });
  });

  describe("determinism", () => {
    it("should produce same result for same input", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 2000,
          totalPaid: 4000,
          totalOwed: 2000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: -1000,
          totalPaid: 1000,
          totalOwed: 2000,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -1000,
          totalPaid: 1000,
          totalOwed: 2000,
        },
      ];

      const result1 = optimizeSettlements(balances);
      const result2 = optimizeSettlements(balances);
      const result3 = optimizeSettlements(balances);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it("should break ties by participantId for deterministic ordering", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -1000,
          totalPaid: 0,
          totalOwed: 1000,
        },
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: -1000, // Same debt as Charlie
          totalPaid: 0,
          totalOwed: 1000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: 2000,
          totalPaid: 3000,
          totalOwed: 1000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      // Should process in deterministic order (sorted by ID when amounts equal)
      // Since alice < charlie alphabetically, alice should be processed first
      expect(settlements).toHaveLength(2);

      // Verify determinism by running multiple times
      const result1 = optimizeSettlements(balances);
      const result2 = optimizeSettlements(balances);
      expect(result1).toEqual(result2);
    });
  });

  describe("edge cases", () => {
    it("should handle empty balance array", () => {
      const settlements = optimizeSettlements([]);
      expect(settlements).toEqual([]);
    });

    it("should handle single participant", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 0,
          totalPaid: 1000,
          totalOwed: 1000,
        },
      ];

      const settlements = optimizeSettlements(balances);
      expect(settlements).toEqual([]);
    });

    it("should handle all creditors (no debtors)", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 1000,
          totalPaid: 2000,
          totalOwed: 1000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: 1000,
          totalPaid: 2000,
          totalOwed: 1000,
        },
      ];

      const settlements = optimizeSettlements(balances);
      expect(settlements).toEqual([]);
    });

    it("should handle all debtors (no creditors)", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: -1000,
          totalPaid: 0,
          totalOwed: 1000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: -1000,
          totalPaid: 0,
          totalOwed: 1000,
        },
      ];

      const settlements = optimizeSettlements(balances);
      expect(settlements).toEqual([]);
    });
  });

  describe("correctness verification", () => {
    it("should settle all debts when applied", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 3000,
          totalPaid: 5000,
          totalOwed: 2000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: -1000,
          totalPaid: 1000,
          totalOwed: 2000,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -2000,
          totalPaid: 0,
          totalOwed: 2000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      // Simulate applying settlements
      const finalBalances = new Map<string, number>();
      balances.forEach((b) =>
        finalBalances.set(b.participantId, b.netPosition),
      );

      settlements.forEach((s) => {
        finalBalances.set(s.from, finalBalances.get(s.from)! + s.amount);
        finalBalances.set(s.to, finalBalances.get(s.to)! - s.amount);
      });

      // After settlements, all balances should be zero
      finalBalances.forEach((balance) => {
        expect(balance).toBe(0);
      });
    });

    it("should handle traceability - every settlement amount is traceable to net positions", () => {
      const balances: ParticipantBalance[] = [
        {
          participantId: "alice",
          participantName: "Alice",
          netPosition: 2500,
          totalPaid: 4500,
          totalOwed: 2000,
        },
        {
          participantId: "bob",
          participantName: "Bob",
          netPosition: -1000,
          totalPaid: 1000,
          totalOwed: 2000,
        },
        {
          participantId: "charlie",
          participantName: "Charlie",
          netPosition: -1500,
          totalPaid: 500,
          totalOwed: 2000,
        },
      ];

      const settlements = optimizeSettlements(balances);

      // Every settlement amount should be <= the absolute net position of the participants
      settlements.forEach((s) => {
        const fromBalance = balances.find((b) => b.participantId === s.from)!;
        const toBalance = balances.find((b) => b.participantId === s.to)!;

        expect(s.amount).toBeLessThanOrEqual(Math.abs(fromBalance.netPosition));
        expect(s.amount).toBeLessThanOrEqual(toBalance.netPosition);
      });
    });
  });
});
