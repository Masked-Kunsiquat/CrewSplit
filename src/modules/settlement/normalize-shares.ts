/**
 * SETTLEMENT MODULE - Share Normalization
 * MODELER: Convert different share types to actual amounts
 */

import { ExpenseSplit } from '../expenses/types';

/**
 * Normalize different split types to actual amounts in cents
 * @param splits - Array of splits for a single expense
 * @param expenseAmount - Total expense amount in cents
 * @returns Array of normalized amounts (one per split)
 */
export const normalizeShares = (
  splits: ExpenseSplit[],
  expenseAmount: number
): number[] => {
  // TODO: MODELER implements this
  // Handle 4 split types:
  // - 'equal': expenseAmount / splits.length
  // - 'percentage': (split.share / 100) * expenseAmount
  // - 'amount': split.amount (must sum to expenseAmount)
  // - 'weight': (split.share / totalWeight) * expenseAmount
  // Round to cents, handle remainder distribution

  return [];
};
