/**
 * SETTLEMENT MODULE - calculateBalances Tests
 * MODELER: Test balance calculation across multiple expenses
 */

import { calculateBalances } from '../calculate-balances';
import { Expense, ExpenseSplit } from '../../expenses/types';
import { Participant } from '../../participants/types';

describe('calculateBalances', () => {
  const mockParticipants: Participant[] = [
    { id: 'alice', tripId: 't1', name: 'Alice', createdAt: '2024-01-01' },
    { id: 'bob', tripId: 't1', name: 'Bob', createdAt: '2024-01-01' },
    { id: 'charlie', tripId: 't1', name: 'Charlie', createdAt: '2024-01-01' },
  ];

  describe('single expense scenarios', () => {
    it('should calculate balances for single expense with equal split', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Dinner',
          amount: 3000, // $30.00
          currency: 'USD',
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

      const balances = calculateBalances(expenses, splits, mockParticipants);

      expect(balances).toHaveLength(3);

      const alice = balances.find(b => b.participantId === 'alice');
      expect(alice).toMatchObject({
        participantId: 'alice',
        participantName: 'Alice',
        totalPaid: 3000,
        totalOwed: 1000,
        netPosition: 2000, // Alice paid $30, owes $10, net +$20
      });

      const bob = balances.find(b => b.participantId === 'bob');
      expect(bob).toMatchObject({
        participantId: 'bob',
        participantName: 'Bob',
        totalPaid: 0,
        totalOwed: 1000,
        netPosition: -1000, // Bob paid $0, owes $10, net -$10
      });

      const charlie = balances.find(b => b.participantId === 'charlie');
      expect(charlie).toMatchObject({
        participantId: 'charlie',
        participantName: 'Charlie',
        totalPaid: 0,
        totalOwed: 1000,
        netPosition: -1000, // Charlie paid $0, owes $10, net -$10
      });
    });

    it('should calculate balances with percentage split', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Hotel',
          amount: 10000, // $100.00
          currency: 'USD',
          paidBy: 'bob',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 50, shareType: 'percentage' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 30, shareType: 'percentage' },
        { id: 's3', expenseId: 'e1', participantId: 'charlie', share: 20, shareType: 'percentage' },
      ];

      const balances = calculateBalances(expenses, splits, mockParticipants);

      const alice = balances.find(b => b.participantId === 'alice');
      expect(alice).toMatchObject({
        totalPaid: 0,
        totalOwed: 5000, // 50% of $100
        netPosition: -5000,
      });

      const bob = balances.find(b => b.participantId === 'bob');
      expect(bob).toMatchObject({
        totalPaid: 10000,
        totalOwed: 3000, // 30% of $100
        netPosition: 7000,
      });

      const charlie = balances.find(b => b.participantId === 'charlie');
      expect(charlie).toMatchObject({
        totalPaid: 0,
        totalOwed: 2000, // 20% of $100
        netPosition: -2000,
      });
    });
  });

  describe('multiple expenses', () => {
    it('should consolidate balances across multiple expenses', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Breakfast',
          amount: 3000, // $30.00
          currency: 'USD',
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 'e2',
          tripId: 't1',
          description: 'Lunch',
          amount: 6000, // $60.00
          currency: 'USD',
          paidBy: 'bob',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        // Breakfast split equally
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's3', expenseId: 'e1', participantId: 'charlie', share: 0, shareType: 'equal' },
        // Lunch split equally
        { id: 's4', expenseId: 'e2', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's5', expenseId: 'e2', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's6', expenseId: 'e2', participantId: 'charlie', share: 0, shareType: 'equal' },
      ];

      const balances = calculateBalances(expenses, splits, mockParticipants);

      const alice = balances.find(b => b.participantId === 'alice');
      expect(alice).toMatchObject({
        totalPaid: 3000,
        totalOwed: 3000, // $10 + $20
        netPosition: 0, // Perfectly settled
      });

      const bob = balances.find(b => b.participantId === 'bob');
      expect(bob).toMatchObject({
        totalPaid: 6000,
        totalOwed: 3000, // $10 + $20
        netPosition: 3000,
      });

      const charlie = balances.find(b => b.participantId === 'charlie');
      expect(charlie).toMatchObject({
        totalPaid: 0,
        totalOwed: 3000, // $10 + $20
        netPosition: -3000,
      });
    });

    it('should handle complex multi-expense scenario', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Gas',
          amount: 5000,
          currency: 'USD',
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 'e2',
          tripId: 't1',
          description: 'Hotel',
          amount: 12000,
          currency: 'USD',
          paidBy: 'bob',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        {
          id: 'e3',
          tripId: 't1',
          description: 'Dinner',
          amount: 9000,
          currency: 'USD',
          paidBy: 'charlie',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        // Gas: equal split
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's3', expenseId: 'e1', participantId: 'charlie', share: 0, shareType: 'equal' },
        // Hotel: equal split
        { id: 's4', expenseId: 'e2', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's5', expenseId: 'e2', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's6', expenseId: 'e2', participantId: 'charlie', share: 0, shareType: 'equal' },
        // Dinner: equal split
        { id: 's7', expenseId: 'e3', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's8', expenseId: 'e3', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's9', expenseId: 'e3', participantId: 'charlie', share: 0, shareType: 'equal' },
      ];

      const balances = calculateBalances(expenses, splits, mockParticipants);

      // Total expenses: $260 ($50 + $120 + $90)
      // Each person owes: ~$86.67

      const totalNetPositions = balances.reduce((sum, b) => sum + b.netPosition, 0);
      expect(totalNetPositions).toBe(0); // Net positions must sum to zero
    });
  });

  describe('missing participants', () => {
    it('should handle expense where payer is not in splits', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Gift for others',
          amount: 2000,
          currency: 'USD',
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        // Alice paid but is not in the split (gift for Bob and Charlie)
        { id: 's1', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'charlie', share: 0, shareType: 'equal' },
      ];

      const balances = calculateBalances(expenses, splits, mockParticipants);

      const alice = balances.find(b => b.participantId === 'alice');
      expect(alice).toMatchObject({
        totalPaid: 2000,
        totalOwed: 0,
        netPosition: 2000, // Alice is owed the full amount
      });

      const bob = balances.find(b => b.participantId === 'bob');
      expect(bob).toMatchObject({
        totalPaid: 0,
        totalOwed: 1000,
        netPosition: -1000,
      });
    });

    it('should include participants with no expenses in results', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Coffee',
          amount: 500,
          currency: 'USD',
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
      ];

      const balances = calculateBalances(expenses, splits, mockParticipants);

      expect(balances).toHaveLength(3);

      const charlie = balances.find(b => b.participantId === 'charlie');
      expect(charlie).toMatchObject({
        totalPaid: 0,
        totalOwed: 0,
        netPosition: 0, // Charlie wasn't involved
      });
    });
  });

  describe('zero value splits', () => {
    it('should handle expense with zero amount', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Free item',
          amount: 0,
          currency: 'USD',
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
      ];

      const balances = calculateBalances(expenses, splits, mockParticipants);

      balances.forEach(balance => {
        expect(balance.totalPaid).toBe(0);
        expect(balance.totalOwed).toBe(0);
        expect(balance.netPosition).toBe(0);
      });
    });

    it('should handle expense with no splits', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Expense without splits',
          amount: 1000,
          currency: 'USD',
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [];

      const balances = calculateBalances(expenses, splits, mockParticipants);

      // Expense is ignored if it has no splits
      balances.forEach(balance => {
        expect(balance.totalPaid).toBe(0);
        expect(balance.totalOwed).toBe(0);
        expect(balance.netPosition).toBe(0);
      });
    });
  });

  describe('determinism and correctness', () => {
    it('should produce same results for same inputs', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Test',
          amount: 1000,
          currency: 'USD',
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

      const result1 = calculateBalances(expenses, splits, mockParticipants);
      const result2 = calculateBalances(expenses, splits, mockParticipants);
      const result3 = calculateBalances(expenses, splits, mockParticipants);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should ensure net positions sum to zero', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Test',
          amount: 9999, // Odd amount to test rounding
          currency: 'USD',
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

      const balances = calculateBalances(expenses, splits, mockParticipants);
      const totalNet = balances.reduce((sum, b) => sum + b.netPosition, 0);

      expect(totalNet).toBe(0); // Must always sum to zero
    });

    it('should be sorted by participantId for determinism', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Test',
          amount: 3000,
          currency: 'USD',
          paidBy: 'charlie', // Different payer
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'charlie', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
        { id: 's3', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
      ];

      const balances = calculateBalances(expenses, splits, mockParticipants);

      // Should be sorted: alice, bob, charlie
      expect(balances[0].participantId).toBe('alice');
      expect(balances[1].participantId).toBe('bob');
      expect(balances[2].participantId).toBe('charlie');
    });
  });

  describe('referential integrity', () => {
    it('should throw structured error when split references non-existent participant', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Dinner',
          amount: 3000,
          currency: 'USD',
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'nonexistent', share: 0, shareType: 'equal' },
      ];

      // Should throw with correct error message
      expect(() => calculateBalances(expenses, splits, mockParticipants)).toThrow(
        'Invalid participant IDs found in expense splits: nonexistent'
      );

      // Should throw structured error with code and array
      try {
        calculateBalances(expenses, splits, mockParticipants);
        fail('Expected calculateBalances to throw');
      } catch (error: any) {
        expect(error.code).toBe('INVALID_PARTICIPANT_IDS');
        expect(error.invalidParticipantIds).toBeDefined();
        expect(error.invalidParticipantIds).toContain('nonexistent');
        expect(error.message).toContain('Invalid participant IDs found in expense splits');
      }
    });

    it('should throw structured error when expense references non-existent payer', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Dinner',
          amount: 3000,
          currency: 'USD',
          paidBy: 'nonexistent-payer',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'bob', share: 0, shareType: 'equal' },
      ];

      // Should throw with correct error message
      expect(() => calculateBalances(expenses, splits, mockParticipants)).toThrow(
        'Invalid payer IDs found in expenses: nonexistent-payer'
      );

      // Should throw structured error with code and array
      try {
        calculateBalances(expenses, splits, mockParticipants);
        fail('Expected calculateBalances to throw');
      } catch (error: any) {
        expect(error.code).toBe('INVALID_PARTICIPANT_IDS');
        expect(error.invalidParticipantIds).toBeDefined();
        expect(error.invalidParticipantIds).toContain('nonexistent-payer');
        expect(error.message).toContain('Invalid payer IDs found in expenses');
      }
    });

    it('should throw error listing multiple invalid participant IDs', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          tripId: 't1',
          description: 'Dinner',
          amount: 3000,
          currency: 'USD',
          paidBy: 'alice',
          date: '2024-01-01',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      const splits: ExpenseSplit[] = [
        { id: 's1', expenseId: 'e1', participantId: 'alice', share: 0, shareType: 'equal' },
        { id: 's2', expenseId: 'e1', participantId: 'invalid1', share: 0, shareType: 'equal' },
        { id: 's3', expenseId: 'e1', participantId: 'invalid2', share: 0, shareType: 'equal' },
      ];

      try {
        calculateBalances(expenses, splits, mockParticipants);
        fail('Expected calculateBalances to throw');
      } catch (error: any) {
        expect(error.code).toBe('INVALID_PARTICIPANT_IDS');
        expect(error.invalidParticipantIds).toHaveLength(2);
        expect(error.invalidParticipantIds).toContain('invalid1');
        expect(error.invalidParticipantIds).toContain('invalid2');
      }
    });
  });
});
