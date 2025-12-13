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
import { settlementLogger } from '@utils/logger';

/**
 * Compute settlement summary for a trip
 * @param tripId - Trip UUID
 * @returns Settlement summary with balances and optimized settlements
 */
export async function computeSettlement(tripId: string): Promise<SettlementSummary> {
  settlementLogger.debug('Computing settlement', { tripId });

  // Load all data in parallel for performance
  const [expenses, participants] = await Promise.all([
    getExpensesForTrip(tripId),
    getParticipantsForTrip(tripId),
  ]);

  settlementLogger.debug('Loaded settlement data', {
    tripId,
    expenseCount: expenses.length,
    participantCount: participants.length,
  });

  // Determine trip currency from first expense (all are normalized to trip currency)
  const tripCurrency = expenses.length > 0 ? expenses[0].currency : 'USD';

  // Edge case: no expenses
  if (expenses.length === 0) {
    settlementLogger.debug('No expenses found, returning empty settlement', { tripId });
    return {
      balances: [],
      settlements: [],
      totalExpenses: 0,
      currency: tripCurrency,
      splitExpensesTotal: 0,
      personalExpensesTotal: 0,
      unsplitExpensesTotal: 0,
      unsplitExpensesCount: 0,
      unsplitExpenseIds: [],
    };
  }

  // Calculate total expenses (in trip currency)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Edge case: participants missing — keep totalExpenses for auditing but skip settlements
  if (participants.length === 0) {
    settlementLogger.warn('No participants found, cannot compute settlements', {
      tripId,
      totalExpenses,
    });
    return {
      balances: [],
      settlements: [],
      totalExpenses,
      currency: tripCurrency,
      splitExpensesTotal: 0,
      personalExpensesTotal: 0,
      unsplitExpensesTotal: totalExpenses,
      unsplitExpensesCount: expenses.length,
      unsplitExpenseIds: expenses.map(e => e.id),
    };
  }

  // Load all splits for all expenses in parallel
  const allSplits = (
    await Promise.all(expenses.map((expense) => getExpenseSplits(expense.id)))
  ).flat();

  // Build a map of expense ID to splits for classification
  const splitsByExpense = new Map<string, typeof allSplits>();
  allSplits.forEach(split => {
    if (!splitsByExpense.has(split.expenseId)) {
      splitsByExpense.set(split.expenseId, []);
    }
    splitsByExpense.get(split.expenseId)!.push(split);
  });

  // Classify expenses by type
  // 1. Unallocated: Zero participants in splits
  const unsplitExpenses = expenses.filter(e => {
    const splits = splitsByExpense.get(e.id) || [];
    return splits.length === 0;
  });

  // 2. Personal: Single participant who is also the payer
  const personalExpenses = expenses.filter(e => {
    const splits = splitsByExpense.get(e.id) || [];
    return splits.length === 1 && splits[0].participantId === e.paidBy;
  });

  // 3. Split: 2+ participants OR 1 participant != payer
  const splitExpenses = expenses.filter(e => {
    const splits = splitsByExpense.get(e.id) || [];
    return splits.length > 1 || (splits.length === 1 && splits[0].participantId !== e.paidBy);
  });

  // Calculate totals for each type
  const unsplitExpensesTotal = unsplitExpenses.reduce((sum, e) => sum + e.amount, 0);
  const personalExpensesTotal = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const splitExpensesTotal = splitExpenses.reduce((sum, e) => sum + e.amount, 0);

  settlementLogger.debug('Classified expenses by type', {
    tripId,
    unsplitCount: unsplitExpenses.length,
    unsplitTotal: unsplitExpensesTotal,
    personalCount: personalExpenses.length,
    personalTotal: personalExpensesTotal,
    splitCount: splitExpenses.length,
    splitTotal: splitExpensesTotal,
  });

  // Filter splits to only those belonging to split expenses
  const splitExpenseIds = new Set(splitExpenses.map(e => e.id));
  const splitsForCalculation = allSplits.filter(split => splitExpenseIds.has(split.expenseId));

  // Step 1: Calculate balances (who paid what, who owes what)
  // Only process split expenses through the settlement engine
  const balances = calculateBalances(splitExpenses, splitsForCalculation, participants);

  // Step 2: Optimize settlements (minimize transactions)
  const settlements = optimizeSettlements(balances);

  settlementLogger.info('Settlement computed successfully', {
    tripId,
    totalExpenses,
    currency: tripCurrency,
    balanceCount: balances.length,
    settlementCount: settlements.length,
    splitExpensesTotal,
    personalExpensesTotal,
    unsplitExpensesTotal,
    unsplitExpensesCount: unsplitExpenses.length,
  });

  return {
    balances,
    settlements,
    totalExpenses,
    currency: tripCurrency,
    splitExpensesTotal,
    personalExpensesTotal,
    unsplitExpensesTotal,
    unsplitExpensesCount: unsplitExpenses.length,
    unsplitExpenseIds: unsplitExpenses.map(e => e.id),
  };
}
