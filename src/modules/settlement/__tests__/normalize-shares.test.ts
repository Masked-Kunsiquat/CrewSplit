/**
 * SETTLEMENT MODULE - normalizeShares Tests
 * MODELER: Test all split type calculations
 */

import { normalizeShares } from '../normalize-shares';
import { ExpenseSplit } from '../../expenses/types';

describe('normalizeShares', () => {
  describe('equal splits', () => {
    it('should divide evenly when amount divides perfectly', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 0, shareType: 'equal' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 0, shareType: 'equal' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 0, shareType: 'equal' },
      ];

      const result = normalizeShares(splits, 3000); // $30.00

      expect(result).toEqual([1000, 1000, 1000]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(3000);
    });

    it('should distribute remainder to first participants when amount does not divide evenly', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 0, shareType: 'equal' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 0, shareType: 'equal' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 0, shareType: 'equal' },
      ];

      const result = normalizeShares(splits, 1000); // $10.00 / 3

      // 1000 / 3 = 333.33...
      // Base: 333, 333, 333 = 999
      // Remainder: 1 cent
      // First participant gets the extra cent
      expect(result).toEqual([334, 333, 333]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it('should handle two-person split with odd amount', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 0, shareType: 'equal' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 0, shareType: 'equal' },
      ];

      const result = normalizeShares(splits, 999); // $9.99

      expect(result).toEqual([500, 499]); // First person gets extra cent
      expect(result.reduce((a, b) => a + b, 0)).toBe(999);
    });

    it('should handle single person split', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 0, shareType: 'equal' },
      ];

      const result = normalizeShares(splits, 5000);

      expect(result).toEqual([5000]);
    });
  });

  describe('percentage splits', () => {
    it('should calculate percentages correctly when they sum to 100', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 50, shareType: 'percentage' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 30, shareType: 'percentage' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 20, shareType: 'percentage' },
      ];

      const result = normalizeShares(splits, 10000); // $100.00

      expect(result).toEqual([5000, 3000, 2000]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(10000);
    });

    it('should distribute remainder deterministically with uneven percentages', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 33.33, shareType: 'percentage' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 33.33, shareType: 'percentage' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 33.34, shareType: 'percentage' },
      ];

      const result = normalizeShares(splits, 1000); // $10.00

      // Exact: 333.3, 333.3, 333.4
      // Floor: 333, 333, 333 = 999
      // Remainder: 1 cent goes to participant with largest fractional part (p3)
      expect(result).toEqual([333, 333, 334]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it('should throw error when percentages do not sum to 100', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 50, shareType: 'percentage' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 30, shareType: 'percentage' },
      ];

      expect(() => normalizeShares(splits, 1000)).toThrow('Percentages must sum to 100');
    });

    it('should allow small floating-point tolerance', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 33.33, shareType: 'percentage' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 33.33, shareType: 'percentage' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 33.34, shareType: 'percentage' }, // Sum is 100.00
      ];

      // Should not throw because sum is exactly 100
      const result = normalizeShares(splits, 1000);

      // Verify result is valid and sums correctly
      expect(result).toHaveLength(3);
      expect(result.reduce((sum, val) => sum + val, 0)).toBe(1000);
    });

    it('should accept percentages at tolerance boundary', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 33.33, shareType: 'percentage' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 33.33, shareType: 'percentage' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 33.33, shareType: 'percentage' }, // Sum is 99.99
      ];

      // Tolerance is |sum - 100| > 0.01, so 99.99 (difference = 0.01) should NOT throw
      const result = normalizeShares(splits, 1000);

      // Verify it normalizes correctly despite being slightly under 100%
      expect(result).toHaveLength(3);
      expect(result.reduce((sum, val) => sum + val, 0)).toBe(1000);
    });

    it('should reject percentages clearly outside tolerance', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 33, shareType: 'percentage' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 33, shareType: 'percentage' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 33, shareType: 'percentage' }, // Sum is 99 (1.00 from 100)
      ];

      // Difference is 1.00, which is > 0.01 tolerance, so should throw
      expect(() => normalizeShares(splits, 1000)).toThrow('Percentages must sum to 100');
    });
  });

  describe('weight splits', () => {
    it('should calculate weighted distribution correctly', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 2, shareType: 'weight' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 1, shareType: 'weight' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 1, shareType: 'weight' },
      ];

      const result = normalizeShares(splits, 4000); // $40.00

      // Total weight: 4
      // p1: 2/4 = 50% = 2000
      // p2: 1/4 = 25% = 1000
      // p3: 1/4 = 25% = 1000
      expect(result).toEqual([2000, 1000, 1000]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(4000);
    });

    it('should handle fractional weights', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 1.5, shareType: 'weight' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 2.5, shareType: 'weight' },
      ];

      const result = normalizeShares(splits, 4000); // $40.00

      // Total weight: 4
      // p1: 1.5/4 = 37.5% = 1500
      // p2: 2.5/4 = 62.5% = 2500
      expect(result).toEqual([1500, 2500]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(4000);
    });

    it('should distribute remainder deterministically with uneven weights', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 1, shareType: 'weight' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 1, shareType: 'weight' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 1, shareType: 'weight' },
      ];

      const result = normalizeShares(splits, 1000); // $10.00

      // Each gets 333.33...
      // Floor: 333, 333, 333 = 999
      // Remainder: 1 cent to first participant (deterministic)
      expect(result).toEqual([334, 333, 333]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it('should throw error for zero or negative total weight', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 0, shareType: 'weight' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 0, shareType: 'weight' },
      ];

      expect(() => normalizeShares(splits, 1000)).toThrow('Total weight must be positive');
    });
  });

  describe('amount splits', () => {
    it('should use exact amounts when they sum to total', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 0, shareType: 'amount', amount: 2500 },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 0, shareType: 'amount', amount: 1500 },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 0, shareType: 'amount', amount: 1000 },
      ];

      const result = normalizeShares(splits, 5000);

      expect(result).toEqual([2500, 1500, 1000]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(5000);
    });

    it('should throw error when amounts do not sum to total', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 0, shareType: 'amount', amount: 2500 },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 0, shareType: 'amount', amount: 1000 },
      ];

      expect(() => normalizeShares(splits, 5000)).toThrow('Split amounts must sum to expense total');
    });

    it('should handle missing amount field as zero', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 0, shareType: 'amount', amount: 5000 },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 0, shareType: 'amount' }, // No amount
      ];

      expect(() => normalizeShares(splits, 5000)).toThrow('Split amounts must sum to expense total');
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty splits', () => {
      const result = normalizeShares([], 1000);
      expect(result).toEqual([]);
    });

    it('should return zeros for zero expense amount', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 0, shareType: 'equal' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 0, shareType: 'equal' },
      ];

      const result = normalizeShares(splits, 0);
      expect(result).toEqual([0, 0]);
    });

    it('should throw error for mixed share types', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 50, shareType: 'percentage' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 0, shareType: 'equal' },
      ];

      expect(() => normalizeShares(splits, 1000)).toThrow('All splits for an expense must have the same shareType');
    });

    it('should produce deterministic results (same input = same output)', () => {
      const splits: ExpenseSplit[] = [
        { id: '1', expenseId: 'e1', participantId: 'p1', share: 1, shareType: 'weight' },
        { id: '2', expenseId: 'e1', participantId: 'p2', share: 1, shareType: 'weight' },
        { id: '3', expenseId: 'e1', participantId: 'p3', share: 1, shareType: 'weight' },
      ];

      const result1 = normalizeShares(splits, 1000);
      const result2 = normalizeShares(splits, 1000);
      const result3 = normalizeShares(splits, 1000);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
