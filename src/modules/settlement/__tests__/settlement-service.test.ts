/**
 * SETTLEMENT SERVICE INTEGRATION TESTS
 * Settlement Integration Engineer: Verify service connects algorithms to data layer
 */

import { computeSettlement } from '../service/SettlementService';
import { db } from '@db/client';
import { trips as tripsTable } from '@db/schema/trips';
import { participants as participantsTable } from '@db/schema/participants';
import { expenses as expensesTable } from '@db/schema/expenses';
import { expenseSplits as expenseSplitsTable } from '@db/schema/expense-splits';
import * as Crypto from 'expo-crypto';

describe('SettlementService', () => {
  /**
   * Clean up all test data after each test to ensure isolation
   * Deletes in correct order to respect foreign key constraints:
   * 1. expense_splits (references expenses and participants)
   * 2. expenses (references trips and participants)
   * 3. participants (references trips)
   * 4. trips (root table)
   */
  afterEach(async () => {
    // Delete in reverse dependency order to avoid foreign key violations
    await db.delete(expenseSplitsTable);
    await db.delete(expensesTable);
    await db.delete(participantsTable);
    await db.delete(tripsTable);
  });

  describe('computeSettlement', () => {
    it('should compute settlement for a trip with expenses', async () => {
      // Create a test trip
      const tripId = Crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(tripsTable).values({
        id: tripId,
        name: 'Test Trip',
        currencyCode: 'USD',
        currency: 'USD',
        startDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create participants
      const aliceId = Crypto.randomUUID();
      const bobId = Crypto.randomUUID();

      await db.insert(participantsTable).values([
        {
          id: aliceId,
          tripId,
          name: 'Alice',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: bobId,
          tripId,
          name: 'Bob',
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Create expense: Alice paid $30 for both
      const expenseId = Crypto.randomUUID();
      await db.insert(expensesTable).values({
        id: expenseId,
        tripId,
        description: 'Dinner',
        amount: 3000, // $30 in cents
        currency: 'USD',
        originalCurrency: 'USD',
        originalAmountMinor: 3000,
        fxRateToTrip: null,
        convertedAmountMinor: 3000,
        paidBy: aliceId,
        date: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create splits: Equal split
      await db.insert(expenseSplitsTable).values([
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: aliceId,
          share: 1,
          shareType: 'equal',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: bobId,
          share: 1,
          shareType: 'equal',
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Compute settlement
      const settlement = await computeSettlement(tripId);

      // Verify results
      expect(settlement.currency).toBe('USD');
      expect(settlement.totalExpenses).toBe(3000);
      expect(settlement.balances).toHaveLength(2);

      // Alice should be owed $15 (paid $30, owes $15)
      const aliceBalance = settlement.balances.find(b => b.participantId === aliceId);
      expect(aliceBalance).toBeDefined();
      expect(aliceBalance!.totalPaid).toBe(3000);
      expect(aliceBalance!.totalOwed).toBe(1500);
      expect(aliceBalance!.netPosition).toBe(1500);

      // Bob should owe $15 (paid $0, owes $15)
      const bobBalance = settlement.balances.find(b => b.participantId === bobId);
      expect(bobBalance).toBeDefined();
      expect(bobBalance!.totalPaid).toBe(0);
      expect(bobBalance!.totalOwed).toBe(1500);
      expect(bobBalance!.netPosition).toBe(-1500);

      // Settlement: Bob pays Alice $15
      expect(settlement.settlements).toHaveLength(1);
      expect(settlement.settlements[0]).toEqual({
        from: bobId,
        fromName: 'Bob',
        to: aliceId,
        toName: 'Alice',
        amount: 1500,
      });
    });

    it('should handle multi-currency expenses using convertedAmountMinor', async () => {
      // Create a test trip
      const tripId = Crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(tripsTable).values({
        id: tripId,
        name: 'Euro Trip',
        currencyCode: 'EUR',
        currency: 'EUR',
        startDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create participant
      const charlieId = Crypto.randomUUID();

      await db.insert(participantsTable).values({
        id: charlieId,
        tripId,
        name: 'Charlie',
        createdAt: now,
        updatedAt: now,
      });

      // Create expense: Charlie paid $100 USD, converted to EUR at 0.92 rate
      const expenseId = Crypto.randomUUID();
      await db.insert(expensesTable).values({
        id: expenseId,
        tripId,
        description: 'Hotel',
        amount: 9200, // €92 in cents (converted)
        currency: 'EUR',
        originalCurrency: 'USD',
        originalAmountMinor: 10000, // $100 in cents
        fxRateToTrip: 0.92,
        convertedAmountMinor: 9200, // €92 in cents
        paidBy: charlieId,
        date: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create split: Charlie pays all
      await db.insert(expenseSplitsTable).values({
        id: Crypto.randomUUID(),
        expenseId,
        participantId: charlieId,
        share: 1,
        shareType: 'equal',
        createdAt: now,
        updatedAt: now,
      });

      // Compute settlement
      const settlement = await computeSettlement(tripId);

      // Verify settlement uses convertedAmountMinor (EUR)
      expect(settlement.currency).toBe('EUR');
      expect(settlement.totalExpenses).toBe(9200); // €92 in cents
      expect(settlement.balances).toHaveLength(1);

      const charlieBalance = settlement.balances[0];
      expect(charlieBalance.participantId).toBe(charlieId);
      expect(charlieBalance.totalPaid).toBe(9200); // €92 in cents
      expect(charlieBalance.totalOwed).toBe(9200); // €92 in cents
      expect(charlieBalance.netPosition).toBe(0); // Balanced

      // No settlements needed
      expect(settlement.settlements).toHaveLength(0);
    });

    it('should throw error for non-existent trip', async () => {
      const nonExistentTripId = Crypto.randomUUID();

      await expect(computeSettlement(nonExistentTripId)).rejects.toThrow(
        `Trip not found for id ${nonExistentTripId}`
      );
    });

    it('should handle trips with no expenses', async () => {
      // Create a test trip with no expenses
      const tripId = Crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(tripsTable).values({
        id: tripId,
        name: 'Empty Trip',
        currencyCode: 'USD',
        currency: 'USD',
        startDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create participants
      const daveId = Crypto.randomUUID();
      await db.insert(participantsTable).values({
        id: daveId,
        tripId,
        name: 'Dave',
        createdAt: now,
        updatedAt: now,
      });

      // Compute settlement
      const settlement = await computeSettlement(tripId);

      // Verify results
      expect(settlement.currency).toBe('USD');
      expect(settlement.totalExpenses).toBe(0);
      expect(settlement.balances).toHaveLength(1);
      expect(settlement.balances[0].netPosition).toBe(0);
      expect(settlement.settlements).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle weighted-share splits correctly', async () => {
      // Create a test trip
      const tripId = Crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(tripsTable).values({
        id: tripId,
        name: 'Weighted Split Trip',
        currencyCode: 'USD',
        currency: 'USD',
        startDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create participants
      const aliceId = Crypto.randomUUID();
      const bobId = Crypto.randomUUID();

      await db.insert(participantsTable).values([
        { id: aliceId, tripId, name: 'Alice', createdAt: now, updatedAt: now },
        { id: bobId, tripId, name: 'Bob', createdAt: now, updatedAt: now },
      ]);

      // Create expense: Alice paid $90, split 2:1 (Alice gets 2 shares, Bob gets 1 share)
      const expenseId = Crypto.randomUUID();
      await db.insert(expensesTable).values({
        id: expenseId,
        tripId,
        description: 'Weighted Expense',
        amount: 9000, // $90 in cents
        currency: 'USD',
        originalCurrency: 'USD',
        originalAmountMinor: 9000,
        fxRateToTrip: null,
        convertedAmountMinor: 9000,
        paidBy: aliceId,
        date: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create weighted splits (2:1 ratio)
      await db.insert(expenseSplitsTable).values([
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: aliceId,
          share: 2, // 2 shares
          shareType: 'weight',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: bobId,
          share: 1, // 1 share
          shareType: 'weight',
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Compute settlement
      const settlement = await computeSettlement(tripId);

      // Verify results
      expect(settlement.currency).toBe('USD');
      expect(settlement.totalExpenses).toBe(9000);
      expect(settlement.balances).toHaveLength(2);

      // Alice: paid $90, owes $60 (2/3 of $90) → net +$30
      const aliceBalance = settlement.balances.find(b => b.participantId === aliceId);
      expect(aliceBalance).toBeDefined();
      expect(aliceBalance!.totalPaid).toBe(9000);
      expect(aliceBalance!.totalOwed).toBe(6000); // 2/3 of 9000
      expect(aliceBalance!.netPosition).toBe(3000); // +$30

      // Bob: paid $0, owes $30 (1/3 of $90) → net -$30
      const bobBalance = settlement.balances.find(b => b.participantId === bobId);
      expect(bobBalance).toBeDefined();
      expect(bobBalance!.totalPaid).toBe(0);
      expect(bobBalance!.totalOwed).toBe(3000); // 1/3 of 9000
      expect(bobBalance!.netPosition).toBe(-3000); // -$30

      // Settlement: Bob pays Alice $30
      expect(settlement.settlements).toHaveLength(1);
      expect(settlement.settlements[0]).toEqual({
        from: bobId,
        fromName: 'Bob',
        to: aliceId,
        toName: 'Alice',
        amount: 3000,
      });
    });

    it('should handle excluded participants correctly', async () => {
      // Create a test trip
      const tripId = Crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(tripsTable).values({
        id: tripId,
        name: 'Excluded Participant Trip',
        currencyCode: 'USD',
        currency: 'USD',
        startDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create three participants
      const aliceId = Crypto.randomUUID();
      const bobId = Crypto.randomUUID();
      const charlieId = Crypto.randomUUID();

      await db.insert(participantsTable).values([
        { id: aliceId, tripId, name: 'Alice', createdAt: now, updatedAt: now },
        { id: bobId, tripId, name: 'Bob', createdAt: now, updatedAt: now },
        { id: charlieId, tripId, name: 'Charlie', createdAt: now, updatedAt: now },
      ]);

      // Create expense: Alice paid $60, but Charlie is excluded from split
      const expenseId = Crypto.randomUUID();
      await db.insert(expensesTable).values({
        id: expenseId,
        tripId,
        description: 'Lunch for Alice and Bob',
        amount: 6000, // $60 in cents
        currency: 'USD',
        originalCurrency: 'USD',
        originalAmountMinor: 6000,
        fxRateToTrip: null,
        convertedAmountMinor: 6000,
        paidBy: aliceId,
        date: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create splits: only Alice and Bob (Charlie excluded)
      await db.insert(expenseSplitsTable).values([
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: aliceId,
          share: 1,
          shareType: 'equal',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: bobId,
          share: 1,
          shareType: 'equal',
          createdAt: now,
          updatedAt: now,
        },
        // Charlie is NOT in the splits
      ]);

      // Compute settlement
      const settlement = await computeSettlement(tripId);

      // Verify results
      expect(settlement.balances).toHaveLength(3);

      // Alice: paid $60, owes $30 → net +$30
      const aliceBalance = settlement.balances.find(b => b.participantId === aliceId);
      expect(aliceBalance!.totalPaid).toBe(6000);
      expect(aliceBalance!.totalOwed).toBe(3000);
      expect(aliceBalance!.netPosition).toBe(3000);

      // Bob: paid $0, owes $30 → net -$30
      const bobBalance = settlement.balances.find(b => b.participantId === bobId);
      expect(bobBalance!.totalPaid).toBe(0);
      expect(bobBalance!.totalOwed).toBe(3000);
      expect(bobBalance!.netPosition).toBe(-3000);

      // Charlie: paid $0, owes $0 → net $0 (excluded from expense)
      const charlieBalance = settlement.balances.find(b => b.participantId === charlieId);
      expect(charlieBalance).toBeDefined();
      expect(charlieBalance!.totalPaid).toBe(0);
      expect(charlieBalance!.totalOwed).toBe(0);
      expect(charlieBalance!.netPosition).toBe(0);

      // Settlement: Bob pays Alice $30 (Charlie not involved)
      expect(settlement.settlements).toHaveLength(1);
      expect(settlement.settlements[0]).toEqual({
        from: bobId,
        fromName: 'Bob',
        to: aliceId,
        toName: 'Alice',
        amount: 3000,
      });
    });

    it('should handle zero-value splits correctly', async () => {
      // Create a test trip
      const tripId = Crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(tripsTable).values({
        id: tripId,
        name: 'Zero Share Trip',
        currencyCode: 'USD',
        currency: 'USD',
        startDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create participants
      const aliceId = Crypto.randomUUID();
      const bobId = Crypto.randomUUID();
      const charlieId = Crypto.randomUUID();

      await db.insert(participantsTable).values([
        { id: aliceId, tripId, name: 'Alice', createdAt: now, updatedAt: now },
        { id: bobId, tripId, name: 'Bob', createdAt: now, updatedAt: now },
        { id: charlieId, tripId, name: 'Charlie', createdAt: now, updatedAt: now },
      ]);

      // Create expense with weighted splits where Charlie has 0 weight
      const expenseId = Crypto.randomUUID();
      await db.insert(expensesTable).values({
        id: expenseId,
        tripId,
        description: 'Expense with zero share',
        amount: 8000, // $80 in cents
        currency: 'USD',
        originalCurrency: 'USD',
        originalAmountMinor: 8000,
        fxRateToTrip: null,
        convertedAmountMinor: 8000,
        paidBy: aliceId,
        date: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create splits: Alice weight=3, Bob weight=1, Charlie weight=0
      await db.insert(expenseSplitsTable).values([
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: aliceId,
          share: 3,
          shareType: 'weight',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: bobId,
          share: 1,
          shareType: 'weight',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: charlieId,
          share: 0, // Zero weight
          shareType: 'weight',
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Compute settlement
      const settlement = await computeSettlement(tripId);

      // Verify results
      expect(settlement.balances).toHaveLength(3);

      // Alice: paid $80, owes $60 (3/4 of $80) → net +$20
      const aliceBalance = settlement.balances.find(b => b.participantId === aliceId);
      expect(aliceBalance!.totalPaid).toBe(8000);
      expect(aliceBalance!.totalOwed).toBe(6000); // 3/4 of 8000
      expect(aliceBalance!.netPosition).toBe(2000);

      // Bob: paid $0, owes $20 (1/4 of $80) → net -$20
      const bobBalance = settlement.balances.find(b => b.participantId === bobId);
      expect(bobBalance!.totalPaid).toBe(0);
      expect(bobBalance!.totalOwed).toBe(2000); // 1/4 of 8000
      expect(bobBalance!.netPosition).toBe(-2000);

      // Charlie: paid $0, owes $0 (0/4 of $80) → net $0
      const charlieBalance = settlement.balances.find(b => b.participantId === charlieId);
      expect(charlieBalance).toBeDefined();
      expect(charlieBalance!.totalPaid).toBe(0);
      expect(charlieBalance!.totalOwed).toBe(0); // 0/4 of 8000
      expect(charlieBalance!.netPosition).toBe(0);

      // Settlement: Bob pays Alice $20
      expect(settlement.settlements).toHaveLength(1);
      expect(settlement.settlements[0]).toEqual({
        from: bobId,
        fromName: 'Bob',
        to: aliceId,
        toName: 'Alice',
        amount: 2000,
      });
    });

    it('should handle expense referencing non-existent participant', async () => {
      // Create a test trip
      const tripId = Crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(tripsTable).values({
        id: tripId,
        name: 'Invalid Participant Trip',
        currencyCode: 'USD',
        currency: 'USD',
        startDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create only Alice
      const aliceId = Crypto.randomUUID();
      await db.insert(participantsTable).values({
        id: aliceId,
        tripId,
        name: 'Alice',
        createdAt: now,
        updatedAt: now,
      });

      // Create expense paid by Alice
      const expenseId = Crypto.randomUUID();
      await db.insert(expensesTable).values({
        id: expenseId,
        tripId,
        description: 'Expense with invalid participant',
        amount: 5000,
        currency: 'USD',
        originalCurrency: 'USD',
        originalAmountMinor: 5000,
        fxRateToTrip: null,
        convertedAmountMinor: 5000,
        paidBy: aliceId,
        date: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create split referencing non-existent participant
      const nonExistentId = Crypto.randomUUID();
      await db.insert(expenseSplitsTable).values([
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: aliceId,
          share: 1,
          shareType: 'equal',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: Crypto.randomUUID(),
          expenseId,
          participantId: nonExistentId, // Non-existent participant
          share: 1,
          shareType: 'equal',
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Compute settlement - should throw structured error for invalid participant ID
      await expect(computeSettlement(tripId)).rejects.toThrow(
        `Invalid participant IDs found in expense splits: ${nonExistentId}`
      );

      // Verify the error has the correct structure
      try {
        await computeSettlement(tripId);
        fail('Expected computeSettlement to throw');
      } catch (error: any) {
        expect(error.code).toBe('INVALID_PARTICIPANT_IDS');
        expect(error.invalidParticipantIds).toBeDefined();
        expect(error.invalidParticipantIds).toContain(nonExistentId);
        expect(error.message).toContain('Invalid participant IDs found in expense splits');
      }
    });
  });

  describe('determinism', () => {
    it('should produce identical results for same data', async () => {
      // Create a test trip
      const tripId = Crypto.randomUUID();
      const now = new Date().toISOString();

      await db.insert(tripsTable).values({
        id: tripId,
        name: 'Deterministic Trip',
        currencyCode: 'USD',
        currency: 'USD',
        startDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Create participants
      const participant1Id = Crypto.randomUUID();
      const participant2Id = Crypto.randomUUID();
      const participant3Id = Crypto.randomUUID();

      await db.insert(participantsTable).values([
        { id: participant1Id, tripId, name: 'P1', createdAt: now, updatedAt: now },
        { id: participant2Id, tripId, name: 'P2', createdAt: now, updatedAt: now },
        { id: participant3Id, tripId, name: 'P3', createdAt: now, updatedAt: now },
      ]);

      // Create multiple expenses
      const expense1Id = Crypto.randomUUID();
      const expense2Id = Crypto.randomUUID();

      await db.insert(expensesTable).values([
        {
          id: expense1Id,
          tripId,
          description: 'Expense 1',
          amount: 6000,
          currency: 'USD',
          originalCurrency: 'USD',
          originalAmountMinor: 6000,
          fxRateToTrip: null,
          convertedAmountMinor: 6000,
          paidBy: participant1Id,
          date: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: expense2Id,
          tripId,
          description: 'Expense 2',
          amount: 9000,
          currency: 'USD',
          originalCurrency: 'USD',
          originalAmountMinor: 9000,
          fxRateToTrip: null,
          convertedAmountMinor: 9000,
          paidBy: participant2Id,
          date: now,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      // Create splits
      await db.insert(expenseSplitsTable).values([
        { id: Crypto.randomUUID(), expenseId: expense1Id, participantId: participant1Id, share: 1, shareType: 'equal', createdAt: now, updatedAt: now },
        { id: Crypto.randomUUID(), expenseId: expense1Id, participantId: participant2Id, share: 1, shareType: 'equal', createdAt: now, updatedAt: now },
        { id: Crypto.randomUUID(), expenseId: expense1Id, participantId: participant3Id, share: 1, shareType: 'equal', createdAt: now, updatedAt: now },
        { id: Crypto.randomUUID(), expenseId: expense2Id, participantId: participant1Id, share: 1, shareType: 'equal', createdAt: now, updatedAt: now },
        { id: Crypto.randomUUID(), expenseId: expense2Id, participantId: participant2Id, share: 1, shareType: 'equal', createdAt: now, updatedAt: now },
        { id: Crypto.randomUUID(), expenseId: expense2Id, participantId: participant3Id, share: 1, shareType: 'equal', createdAt: now, updatedAt: now },
      ]);

      // Compute settlement multiple times
      const settlement1 = await computeSettlement(tripId);
      const settlement2 = await computeSettlement(tripId);
      const settlement3 = await computeSettlement(tripId);

      // Verify all three calls produce identical results
      expect(settlement1).toEqual(settlement2);
      expect(settlement2).toEqual(settlement3);

      // Verify deterministic ordering of balances
      expect(settlement1.balances).toEqual(settlement1.balances.slice().sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      ));

      // Verify deterministic ordering of settlements
      const expectedSettlementOrder = settlement1.settlements.slice().sort((a, b) => {
        // Sort by from participant ID first
        const fromCompare = a.from.localeCompare(b.from);
        if (fromCompare !== 0) return fromCompare;

        // Then by to participant ID
        const toCompare = a.to.localeCompare(b.to);
        if (toCompare !== 0) return toCompare;

        // Finally by amount (numeric sort)
        return a.amount - b.amount;
      });

      expect(settlement1.settlements).toEqual(expectedSettlementOrder);
      expect(settlement2.settlements).toEqual(expectedSettlementOrder);
      expect(settlement3.settlements).toEqual(expectedSettlementOrder);
    });
  });
});
