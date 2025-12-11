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

      // Verify deterministic ordering
      expect(settlement1.balances).toEqual(settlement1.balances.slice().sort((a, b) =>
        a.participantId.localeCompare(b.participantId)
      ));
    });
  });
});
