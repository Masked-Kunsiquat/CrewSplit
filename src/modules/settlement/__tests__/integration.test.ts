/**
 * SETTLEMENT MODULE - Integration Tests
 * MODELER: Test the full settlement calculation pipeline
 */

import { normalizeShares } from '../normalize-shares';
import { calculateBalances } from '../calculate-balances';
import { optimizeSettlements } from '../optimize-settlements';
import { Expense, ExpenseSplit } from '../../expenses/types';
import { Participant } from '../../participants/types';

describe('Settlement Integration', () => {
  describe('end-to-end settlement calculation', () => {
    it('should calculate complete settlement for simple trip', () => {
      // Scenario: Weekend trip with 3 people
      // - Alice paid for hotel ($300)
      // - Bob paid for gas ($60)
      // - Charlie paid for groceries ($90)
      // - All expenses split equally

      const participants: Participant[] = [
        { id: 'alice', tripId: 't1', name: 'Alice', createdAt: '2024-01-01' },
        { id: 'bob', tripId: 't1', name: 'Bob', createdAt: '2024-01-01' },
        { id: 'charlie', tripId: 't1', name: 'Charlie', createdAt: '2024-01-01' },
      ];

      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Hotel',
          amount: 30000, // $300.00
          currency: 'USD',
          originalCurrency: 'USD',
          originalAmountMinor: 30000,
          convertedAmountMinor: 30000,
          fxRateToTrip: null,
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 'e2',
          tripId: 't1',
          description: 'Gas',
          amount: 6000, // $60.00
          currency: 'USD',
          originalCurrency: 'USD',
          originalAmountMinor: 6000,
          convertedAmountMinor: 6000,
          fxRateToTrip: null,
          paidBy: 'bob',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 'e3',
          tripId: 't1',
          description: 'Groceries',
          amount: 9000, // $90.00
          currency: 'USD',
          originalCurrency: 'USD',
          originalAmountMinor: 9000,
          convertedAmountMinor: 9000,
          fxRateToTrip: null,
          paidBy: 'charlie',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        // Hotel split
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's3', expenseId: 'e1', participantId: 'charlie', share: 0, shareType: 'equal' },
        // Gas split
        { id: 's4', expenseId: 'e2', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's5', expenseId: 'e2', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's6', expenseId: 'e2', participantId: 'charlie', share: 0, shareType: 'equal' },
        // Groceries split
        { id: 's7', expenseId: 'e3', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's8', expenseId: 'e3', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's9', expenseId: 'e3', participantId: 'charlie', share: 0, shareType: 'equal' },
      ];

      // Step 1: Calculate balances
      const balances = calculateBalances(expenses, splits, participants);

      // Total: $450, Each should pay: $150
      // Alice paid $300, owes $150, net: +$150
      // Bob paid $60, owes $150, net: -$90
      // Charlie paid $90, owes $150, net: -$60

      const alice = balances.find(b => b.participantId === 'alice')!;
      expect(alice.totalPaid).toBe(30000);
      expect(alice.totalOwed).toBe(15000);
      expect(alice.netPosition).toBe(15000);

      const bob = balances.find(b => b.participantId === 'bob')!;
      expect(bob.totalPaid).toBe(6000);
      expect(bob.totalOwed).toBe(15000);
      expect(bob.netPosition).toBe(-9000);

      const charlie = balances.find(b => b.participantId === 'charlie')!;
      expect(charlie.totalPaid).toBe(9000);
      expect(charlie.totalOwed).toBe(15000);
      expect(charlie.netPosition).toBe(-6000);

      // Step 2: Optimize settlements
      const settlements = optimizeSettlements(balances);

      // Should create 2 settlements:
      // - Bob pays Alice $90
      // - Charlie pays Alice $60
      expect(settlements).toHaveLength(2);

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(15000);

      // Verify all settlements go to Alice (the only creditor)
      settlements.forEach(s => {
        expect(s.to).toBe('alice');
      });
    });

    it('should handle complex trip with different split types', () => {
      const participants: Participant[] = [
        { id: 'alice', tripId: 't1', name: 'Alice', createdAt: '2024-01-01' },
        { id: 'bob', tripId: 't1', name: 'Bob', createdAt: '2024-01-01' },
        { id: 'charlie', tripId: 't1', name: 'Charlie', createdAt: '2024-01-01' },
      ];

      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Hotel (Alice and Bob only)',
          amount: 20000,
          currency: 'USD',
          originalCurrency: 'USD',
          originalAmountMinor: 20000,
          convertedAmountMinor: 20000,
          fxRateToTrip: null,
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 'e2',
          tripId: 't1',
          description: 'Dinner (weighted by appetite)',
          amount: 12000,
          currency: 'USD',
          originalCurrency: 'USD',
          originalAmountMinor: 12000,
          convertedAmountMinor: 12000,
          fxRateToTrip: null,
          paidBy: 'bob',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        // Hotel: only Alice and Bob (equal split)
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
        // Dinner: weighted (Alice: 2, Bob: 2, Charlie: 1)
        { id: 's3', expenseId: 'e2', participantId: 'alice', share: 2, shareType: 'weight' },
        { id: 's4', expenseId: 'e2', participantId: 'bob', share: 2, shareType: 'weight' },
        { id: 's5', expenseId: 'e2', participantId: 'charlie', share: 1, shareType: 'weight' },
      ];

      const balances = calculateBalances(expenses, splits, participants);

      // Verify net positions sum to zero
      const totalNet = balances.reduce((sum, b) => sum + b.netPosition, 0);
      expect(totalNet).toBe(0);

      const settlements = optimizeSettlements(balances);

      // Verify settlements settle all debts
      const finalBalances = new Map<string, number>();
      balances.forEach(b => finalBalances.set(b.participantId, b.netPosition));

      settlements.forEach(s => {
        finalBalances.set(s.from, finalBalances.get(s.from)! + s.amount);
        finalBalances.set(s.to, finalBalances.get(s.to)! - s.amount);
      });

      finalBalances.forEach(balance => {
        expect(balance).toBe(0);
      });
    });

    it('should handle trip where one person paid for everything', () => {
      const participants: Participant[] = [
        { id: 'alice', tripId: 't1', name: 'Alice', createdAt: '2024-01-01' },
        { id: 'bob', tripId: 't1', name: 'Bob', createdAt: '2024-01-01' },
        { id: 'charlie', tripId: 't1', name: 'Charlie', createdAt: '2024-01-01' },
      ];

      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Everything',
          amount: 30000,
          currency: 'USD',
          originalCurrency: 'USD',
          originalAmountMinor: 30000,
          convertedAmountMinor: 30000,
          fxRateToTrip: null,
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's3', expenseId: 'e1', participantId: 'charlie', share: 0, shareType: 'equal' },
      ];

      const balances = calculateBalances(expenses, splits, participants);
      const settlements = optimizeSettlements(balances);

      // Should create 2 settlements (both to Alice)
      expect(settlements).toHaveLength(2);

      settlements.forEach(s => {
        expect(s.to).toBe('alice');
      });

      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(20000); // Alice gets back $200 (paid $300, owes $100)
    });

    it('should handle percentage splits with rounding', () => {
      const participants: Participant[] = [
        { id: 'alice', tripId: 't1', name: 'Alice', createdAt: '2024-01-01' },
        { id: 'bob', tripId: 't1', name: 'Bob', createdAt: '2024-01-01' },
        { id: 'charlie', tripId: 't1', name: 'Charlie', createdAt: '2024-01-01' },
      ];

      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Shared expense',
          amount: 10000, // $100.00
          currency: 'USD',
          originalCurrency: 'USD',
          originalAmountMinor: 10000,
          convertedAmountMinor: 10000,
          fxRateToTrip: null,
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 33.33, shareType: 'percentage' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 33.33, shareType: 'percentage' },
        { id: 's3', expenseId: 'e1', participantId: 'charlie', share: 33.34, shareType: 'percentage' },
      ];

      const balances = calculateBalances(expenses, splits, participants);

      // Verify rounding handled correctly
      const totalOwed = balances.reduce((sum, b) => sum + b.totalOwed, 0);
      expect(totalOwed).toBe(10000); // Must equal total expense

      const settlements = optimizeSettlements(balances);

      // Verify final settlement is valid
      const finalBalances = new Map<string, number>();
      balances.forEach(b => finalBalances.set(b.participantId, b.netPosition));

      settlements.forEach(s => {
        finalBalances.set(s.from, finalBalances.get(s.from)! + s.amount);
        finalBalances.set(s.to, finalBalances.get(s.to)! - s.amount);
      });

      finalBalances.forEach(balance => {
        expect(balance).toBe(0);
      });
    });
  });

  describe('correctness properties', () => {
    it('should always maintain conservation of money', () => {
      const participants: Participant[] = [
        { id: 'alice', tripId: 't1', name: 'Alice', createdAt: '2024-01-01' },
        { id: 'bob', tripId: 't1', name: 'Bob', createdAt: '2024-01-01' },
        { id: 'charlie', tripId: 't1', name: 'Charlie', createdAt: '2024-01-01' },
        { id: 'david', tripId: 't1', name: 'David', createdAt: '2024-01-01' },
      ];

      const expenses: Expense[] = [
        { id: 'e1', tripId: 't1', description: 'E1', amount: 5000, currency: 'USD', originalCurrency: 'USD', originalAmountMinor: 5000, convertedAmountMinor: 5000, fxRateToTrip: null, paidBy: 'alice', date: '2024-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 'e2', tripId: 't1', description: 'E2', amount: 7000, currency: 'USD', originalCurrency: 'USD', originalAmountMinor: 7000, convertedAmountMinor: 7000, fxRateToTrip: null, paidBy: 'bob', date: '2024-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 'e3', tripId: 't1', description: 'E3', amount: 3000, currency: 'USD', originalCurrency: 'USD', originalAmountMinor: 3000, convertedAmountMinor: 3000, fxRateToTrip: null, paidBy: 'charlie', date: '2024-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's3', expenseId: 'e1', participantId: 'charlie', share: 0, shareType: 'equal' },
        { id: 's4', expenseId: 'e1', participantId: 'david', share: 0, shareType: 'equal' },
        { id: 's5', expenseId: 'e2', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's6', expenseId: 'e2', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's7', expenseId: 'e2', participantId: 'charlie', share: 0, shareType: 'equal' },
        { id: 's8', expenseId: 'e2', participantId: 'david', share: 0, shareType: 'equal' },
        { id: 's9', expenseId: 'e3', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's10', expenseId: 'e3', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's11', expenseId: 'e3', participantId: 'charlie', share: 0, shareType: 'equal' },
        { id: 's12', expenseId: 'e3', participantId: 'david', share: 0, shareType: 'equal' },
      ];

      const balances = calculateBalances(expenses, splits, participants);

      // Property 1: Net positions sum to zero
      const totalNet = balances.reduce((sum, b) => sum + b.netPosition, 0);
      expect(totalNet).toBe(0);

      // Property 2: Total paid equals total owed
      const totalPaid = balances.reduce((sum, b) => sum + b.totalPaid, 0);
      const totalOwed = balances.reduce((sum, b) => sum + b.totalOwed, 0);
      expect(totalPaid).toBe(totalOwed);

      const settlements = optimizeSettlements(balances);

      // Property 3: Total settlements equal total positive net positions
      const totalPositive = balances.reduce((sum, b) => sum + Math.max(0, b.netPosition), 0);
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(totalPositive);
    });

    it('should be deterministic across multiple runs', () => {
      const participants: Participant[] = [
        { id: 'alice', tripId: 't1', name: 'Alice', createdAt: '2024-01-01' },
        { id: 'bob', tripId: 't1', name: 'Bob', createdAt: '2024-01-01' },
        { id: 'charlie', tripId: 't1', name: 'Charlie', createdAt: '2024-01-01' },
      ];

      const expenses: Expense[] = [
        { id: 'e1', tripId: 't1', description: 'Test', amount: 9999, currency: 'USD', originalCurrency: 'USD', originalAmountMinor: 9999, convertedAmountMinor: 9999, fxRateToTrip: null, paidBy: 'alice', date: '2024-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's3', expenseId: 'e1', participantId: 'charlie', share: 0, shareType: 'equal' },
      ];

      const run1 = {
        balances: calculateBalances(expenses, splits, participants),
        settlements: optimizeSettlements(calculateBalances(expenses, splits, participants)),
      };

      const run2 = {
        balances: calculateBalances(expenses, splits, participants),
        settlements: optimizeSettlements(calculateBalances(expenses, splits, participants)),
      };

      const run3 = {
        balances: calculateBalances(expenses, splits, participants),
        settlements: optimizeSettlements(calculateBalances(expenses, splits, participants)),
      };

      expect(run1.balances).toEqual(run2.balances);
      expect(run2.balances).toEqual(run3.balances);
      expect(run1.settlements).toEqual(run2.settlements);
      expect(run2.settlements).toEqual(run3.settlements);
    });
  });
});
