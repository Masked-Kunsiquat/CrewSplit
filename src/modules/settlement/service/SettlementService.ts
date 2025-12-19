/**
 * SETTLEMENT INTEGRATION ENGINEER: Settlement Service
 * Connects settlement algorithms to the data layer
 * Operates exclusively on trip currency (convertedAmountMinor)
 *
 * SETTLEMENTS INTEGRATION:
 * - Loads recorded settlement payments from database
 * - Applies settlements as adjustments to base balances
 * - Returns both suggested settlements (from expenses) and recorded settlements
 */

import {
  getExpensesForTrip,
  getExpenseSplits,
} from "../../expenses/repository";
import { getParticipantsForTrip } from "../../participants/repository";
import { SettlementRepository } from "../../settlements/repository";
import { calculateBalances } from "../calculate-balances";
import { optimizeSettlements } from "../optimize-settlements";
import type { SettlementSummary } from "../types";
import type { SettlementWithParticipants } from "../../settlements/types";
import { settlementLogger } from "@utils/logger";

/**
 * Apply recorded settlements to adjust participant balances
 * Settlements reduce the net positions:
 * - Payer's totalPaid increases (debt reduced)
 * - Payee's totalOwed increases (credit reduced)
 *
 * Example: Bob owes Alice $80, Bob pays Alice $50:
 * - Bob's balance: -$80 → -$30 (totalPaid +$50)
 * - Alice's balance: +$80 → +$30 (totalOwed +$50)
 *
 * @param balances - Base balances from expenses
 * @param settlements - Recorded settlement payments
 * @returns Adjusted balances after applying settlements
 */
function applySettlements(
  balances: ReturnType<typeof calculateBalances>,
  settlements: SettlementWithParticipants[],
): ReturnType<typeof calculateBalances> {
  if (settlements.length === 0) {
    return balances;
  }

  // Create mutable copy of balances
  const adjusted = balances.map((b) => ({ ...b }));
  const balanceMap = new Map(adjusted.map((b) => [b.participantId, b]));

  // Apply each settlement
  settlements.forEach((settlement) => {
    const fromBalance = balanceMap.get(settlement.fromParticipantId);
    const toBalance = balanceMap.get(settlement.toParticipantId);

    if (!fromBalance || !toBalance) {
      settlementLogger.warn("Settlement references non-existent participant", {
        settlementId: settlement.id,
        fromParticipantId: settlement.fromParticipantId,
        toParticipantId: settlement.toParticipantId,
      });
      return;
    }

    // Apply settlement (use convertedAmountMinor in trip currency)
    const amount = settlement.convertedAmountMinor;

    // From participant paid this amount (reduces their debt)
    fromBalance.totalPaid += amount;
    fromBalance.netPosition += amount;

    // To participant received this amount (reduces their credit)
    toBalance.totalOwed += amount;
    toBalance.netPosition -= amount;
  });

  // Re-sort by participantId for determinism
  adjusted.sort((a, b) => a.participantId.localeCompare(b.participantId));

  return adjusted;
}

/**
 * Compute settlement summary for a trip
 * @param tripId - Trip UUID
 * @returns Settlement summary with balances, optimized settlements, and recorded settlements
 */
export async function computeSettlement(
  tripId: string,
): Promise<
  SettlementSummary & { recordedSettlements: SettlementWithParticipants[] }
> {
  settlementLogger.debug("Computing settlement", { tripId });

  // Load all data in parallel for performance
  const [expenses, participants, recordedSettlements] = await Promise.all([
    getExpensesForTrip(tripId),
    getParticipantsForTrip(tripId),
    SettlementRepository.getSettlementsForTrip(tripId),
  ]);

  settlementLogger.debug("Loaded settlement data", {
    tripId,
    expenseCount: expenses.length,
    participantCount: participants.length,
    recordedSettlementCount: recordedSettlements.length,
  });

  // Determine trip currency from first expense (all are normalized to trip currency)
  const tripCurrency = expenses.length > 0 ? expenses[0].currency : "USD";

  // Edge case: no expenses
  if (expenses.length === 0) {
    settlementLogger.debug("No expenses found, returning empty settlement", {
      tripId,
    });
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
      recordedSettlements,
    };
  }

  // Calculate total expenses (in trip currency)
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  // Edge case: participants missing — keep totalExpenses for auditing but skip settlements
  if (participants.length === 0) {
    settlementLogger.warn("No participants found, cannot compute settlements", {
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
      unsplitExpenseIds: expenses.map((e) => e.id),
      recordedSettlements,
    };
  }

  // Load all splits for all expenses in parallel
  const allSplits = (
    await Promise.all(expenses.map((expense) => getExpenseSplits(expense.id)))
  ).flat();

  // Build a map of expense ID to splits for classification
  const splitsByExpense = new Map<string, typeof allSplits>();
  allSplits.forEach((split) => {
    if (!splitsByExpense.has(split.expenseId)) {
      splitsByExpense.set(split.expenseId, []);
    }
    splitsByExpense.get(split.expenseId)!.push(split);
  });

  // Classify expenses by type
  // 1. Unallocated: Zero participants in splits
  const unsplitExpenses = expenses.filter((e) => {
    const splits = splitsByExpense.get(e.id) || [];
    return splits.length === 0;
  });

  // 2. Personal: Single participant who is also the payer
  const personalExpenses = expenses.filter((e) => {
    const splits = splitsByExpense.get(e.id) || [];
    return splits.length === 1 && splits[0].participantId === e.paidBy;
  });

  // 3. Split: 2+ participants OR 1 participant != payer
  const splitExpenses = expenses.filter((e) => {
    const splits = splitsByExpense.get(e.id) || [];
    return (
      splits.length > 1 ||
      (splits.length === 1 && splits[0].participantId !== e.paidBy)
    );
  });

  // Calculate totals for each type
  const unsplitExpensesTotal = unsplitExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const personalExpensesTotal = personalExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const splitExpensesTotal = splitExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  settlementLogger.debug("Classified expenses by type", {
    tripId,
    unsplitCount: unsplitExpenses.length,
    unsplitTotal: unsplitExpensesTotal,
    personalCount: personalExpenses.length,
    personalTotal: personalExpensesTotal,
    splitCount: splitExpenses.length,
    splitTotal: splitExpensesTotal,
  });

  // Filter splits to only those belonging to split expenses
  const splitExpenseIds = new Set(splitExpenses.map((e) => e.id));
  const splitsForCalculation = allSplits.filter((split) =>
    splitExpenseIds.has(split.expenseId),
  );

  // Step 1: Calculate base balances (who paid what, who owes what from expenses)
  // Only process split expenses through the settlement engine
  const baseBalances = calculateBalances(
    splitExpenses,
    splitsForCalculation,
    participants,
  );

  // Step 2: Apply recorded settlements to adjust balances
  const adjustedBalances = applySettlements(baseBalances, recordedSettlements);

  // Step 3: Optimize settlements from adjusted balances (minimize transactions)
  const suggestedSettlements = optimizeSettlements(adjustedBalances);

  settlementLogger.info("Settlement computed successfully", {
    tripId,
    totalExpenses,
    currency: tripCurrency,
    balanceCount: adjustedBalances.length,
    suggestedSettlementCount: suggestedSettlements.length,
    recordedSettlementCount: recordedSettlements.length,
    splitExpensesTotal,
    personalExpensesTotal,
    unsplitExpensesTotal,
    unsplitExpensesCount: unsplitExpenses.length,
  });

  return {
    balances: adjustedBalances,
    settlements: suggestedSettlements,
    totalExpenses,
    currency: tripCurrency,
    splitExpensesTotal,
    personalExpensesTotal,
    unsplitExpensesTotal,
    unsplitExpensesCount: unsplitExpenses.length,
    unsplitExpenseIds: unsplitExpenses.map((e) => e.id),
    recordedSettlements,
  };
}
