/**
 * SETTLEMENT INTEGRATION ENGINEER: Settlement Service
 * Connects settlement algorithms to the data layer
 * Operates exclusively on trip currency (convertedAmountMinor)
 */

import { getExpensesForTrip, getExpenseSplits } from '../../expenses/repository';
import { getParticipantsForTrip } from '../../participants/repository';
import { calculateBalances } from '../calculate-balances';
import { optimizeSettlements } from '../optimize-settlements';
import type { SettlementSummary } from '../types';

/**
 * Compute settlement summary for a trip
 * @param tripId - Trip UUID
 * @returns Settlement summary with balances and optimized settlements
 */
export async function computeSettlement(tripId: string): Promise<SettlementSummary> {
  // Load all data in parallel for performance
  const [expenses, participants] = await Promise.all([
    getExpensesForTrip(tripId),
    getParticipantsForTrip(tripId),
  ]);

  // Load all splits for all expenses in parallel
  const allSplits = (
    await Promise.all(expenses.map((expense) => getExpenseSplits(expense.id)))
  ).flat();

  // Determine trip currency from first expense (all are normalized to trip currency)
  const tripCurrency = expenses.length > 0 ? expenses[0].currency : 'USD';

  // Calculate total expenses (in trip currency)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Edge case: no expenses or participants
  if (expenses.length === 0 || participants.length === 0) {
    return {
      balances: [],
      settlements: [],
      totalExpenses: 0,
      currency: tripCurrency,
    };
  }

  // Step 1: Calculate balances (who paid what, who owes what)
  const balances = calculateBalances(expenses, allSplits, participants);

  // Step 2: Optimize settlements (minimize transactions)
  const settlements = optimizeSettlements(balances);

  return {
    balances,
    settlements,
    totalExpenses,
    currency: tripCurrency,
  };
}
