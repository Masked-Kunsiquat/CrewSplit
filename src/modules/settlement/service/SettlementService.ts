/**
 * SETTLEMENT SERVICE
 * Settlement Integration Engineer: Hooks up pure settlement algorithms to data layer
 * Operates exclusively on convertedAmountMinor (trip currency)
 */

import { db } from '@db/client';
import { expenses as expensesTable } from '@db/schema/expenses';
import { expenseSplits as expenseSplitsTable } from '@db/schema/expense-splits';
import { participants as participantsTable } from '@db/schema/participants';
import { trips as tripsTable } from '@db/schema/trips';
import { eq } from 'drizzle-orm';
import { calculateBalances } from '../calculate-balances';
import { optimizeSettlements } from '../optimize-settlements';
import { SettlementSummary } from '../types';
import type { Expense, ExpenseSplit } from '@modules/expenses/types';
import type { Participant } from '@modules/participants/types';

/**
 * Get all expense splits for a trip by joining through expenses
 * Returns splits with the expense's trip association
 */
const getExpenseSplitsForTrip = async (tripId: string): Promise<ExpenseSplit[]> => {
  const rows = await db
    .select({
      id: expenseSplitsTable.id,
      expenseId: expenseSplitsTable.expenseId,
      participantId: expenseSplitsTable.participantId,
      share: expenseSplitsTable.share,
      shareType: expenseSplitsTable.shareType,
      amount: expenseSplitsTable.amount,
    })
    .from(expenseSplitsTable)
    .innerJoin(expensesTable, eq(expenseSplitsTable.expenseId, expensesTable.id))
    .where(eq(expensesTable.tripId, tripId));

  return rows.map(row => ({
    id: row.id,
    expenseId: row.expenseId,
    participantId: row.participantId,
    share: row.share,
    shareType: row.shareType as 'equal' | 'percentage' | 'amount' | 'weight',
    amount: row.amount ?? undefined,
  }));
};

/**
 * Compute settlement for a trip
 *
 * @param tripId - The trip ID to compute settlements for
 * @returns Settlement summary containing balances, settlements, total expenses, and currency
 *
 * @throws Error if trip not found
 *
 * IMPORTANT: This function operates exclusively on convertedAmountMinor (trip currency).
 * All calculations are performed in the trip's currency minor units.
 * No currency conversions or UI formatting are performed here.
 */
export const computeSettlement = async (tripId: string): Promise<SettlementSummary> => {
  // Load trip to get currency
  const tripRows = await db
    .select({ currencyCode: tripsTable.currencyCode })
    .from(tripsTable)
    .where(eq(tripsTable.id, tripId))
    .limit(1);

  if (!tripRows.length) {
    throw new Error(`Trip not found for id ${tripId}`);
  }

  const tripCurrency = tripRows[0].currencyCode;

  // Load all expenses for the trip (using convertedAmountMinor as amount)
  const expenseRows = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.tripId, tripId));

  const expenses: Expense[] = expenseRows.map(row => ({
    id: row.id,
    tripId: row.tripId,
    description: row.description,
    amount: row.convertedAmountMinor, // Use convertedAmountMinor (trip currency)
    currency: row.currency,
    originalCurrency: row.originalCurrency,
    originalAmountMinor: row.originalAmountMinor,
    fxRateToTrip: row.fxRateToTrip ?? undefined,
    convertedAmountMinor: row.convertedAmountMinor,
    paidBy: row.paidBy,
    category: row.category ?? undefined,
    date: row.date,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  // Load all expense splits for the trip
  const splits = await getExpenseSplitsForTrip(tripId);

  // Load all participants for the trip
  const participantRows = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.tripId, tripId));

  const participants: Participant[] = participantRows.map(row => ({
    id: row.id,
    tripId: row.tripId,
    name: row.name,
    avatarColor: row.avatarColor ?? undefined,
    createdAt: row.createdAt,
  }));

  // Calculate balances using pure function
  const balances = calculateBalances(expenses, splits, participants);

  // Optimize settlements using pure function
  const settlements = optimizeSettlements(balances);

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    balances,
    settlements,
    totalExpenses,
    currency: tripCurrency,
  };
};

/**
 * Settlement Service API
 */
export const SettlementService = {
  computeSettlement,
};
