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

import { getExpensesForTrip, getExpenseSplits } from "@modules/expenses";
import { getParticipantsForTrip } from "@modules/participants";
import { SettlementRepository } from "../repository";
import { calculateBalances } from "../engine/calculate-balances";
import { optimizeSettlements } from "../engine/optimize-settlements";
import type { SettlementSummary } from "../types";
import type { SettlementWithParticipants } from "../types";
import { settlementLogger } from "@utils/logger";

/**
 * Applies recorded settlement payments to adjust participant balances.
 *
 * Settlements reduce net positions by treating payments as additional "expenses" where
 * the payer increases their totalPaid and the payee increases their totalOwed.
 * This effectively reduces the debt/credit between participants.
 *
 * Algorithm:
 * 1. Create mutable copies of balances
 * 2. For each settlement: increase payer's totalPaid and payee's totalOwed
 * 3. Recalculate netPosition = totalPaid - totalOwed
 * 4. Re-sort by participantId for determinism
 *
 * Example: Bob owes Alice $80, Bob pays Alice $50:
 * - Bob's balance: -$80 → -$30 (totalPaid +$50, netPosition +$50)
 * - Alice's balance: +$80 → +$30 (totalOwed +$50, netPosition -$50)
 *
 * @param balances - Base balances calculated from expenses (from calculateBalances)
 * @param settlements - Recorded settlement payments with participant details
 *
 * @precondition balances must be from calculateBalances (validated, sorted)
 * @precondition settlements must use convertedAmountMinor in trip currency
 * @precondition All settlement participants should exist in balances
 *
 * @postcondition Sum of netPositions still equals zero (conservation)
 * @postcondition Results sorted by participantId (deterministic)
 * @postcondition No participant appears twice in results
 * @postcondition totalPaid and totalOwed are non-negative for all participants
 *
 * @invariant Money conservation: sum(netPosition) before === sum(netPosition) after === 0
 * @invariant netPosition = totalPaid - totalOwed for all participants
 *
 * @returns Adjusted balances after applying settlements, sorted by participantId
 *
 * @example
 * const baseBalances = [
 *   { participantId: 'p1', netPosition: 500, totalPaid: 1000, totalOwed: 500 },
 *   { participantId: 'p2', netPosition: -500, totalPaid: 0, totalOwed: 500 }
 * ];
 * const settlements = [
 *   { fromParticipantId: 'p2', toParticipantId: 'p1', convertedAmountMinor: 300 }
 * ];
 * const adjusted = applySettlements(baseBalances, settlements);
 * // p1: netPosition = 200 (was owed 500, received 300)
 * // p2: netPosition = -200 (owed 500, paid 300)
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
 * Computes comprehensive settlement summary for a trip.
 *
 * Orchestrates the complete settlement calculation workflow:
 * 1. Loads all expenses, participants, and recorded settlements from database
 * 2. Classifies expenses (split, personal, unallocated)
 * 3. Calculates base balances from split expenses
 * 4. Applies recorded settlements to adjust balances
 * 5. Optimizes remaining settlements using greedy algorithm
 *
 * Operates exclusively on trip currency (expense.convertedAmountMinor).
 * All amounts in results are in minor units (cents) of the trip currency.
 *
 * Edge cases handled:
 * - No expenses: returns empty settlement with 0 totals
 * - No participants: preserves totalExpenses but returns empty balances/settlements
 * - No splits: classifies all expenses as unsplit/personal
 * - Missing participants in settlements: logs warning and skips (non-fatal)
 *
 * @param tripId - Trip UUID to compute settlements for
 *
 * @precondition tripId must reference a valid trip in database
 * @precondition All expenses must be in same trip currency (normalized on write)
 * @precondition All settlement amounts must be in trip currency (convertedAmountMinor)
 *
 * @postcondition balances sum to zero (money conservation)
 * @postcondition totalExpenses = splitExpensesTotal + personalExpensesTotal + unsplitExpensesTotal
 * @postcondition suggestedSettlements are minimal (greedy optimized)
 * @postcondition All amounts in trip currency (cents)
 * @postcondition Results are deterministic (same data always produces same output)
 *
 * @invariant Money conservation: sum(balances.netPosition) === 0
 * @invariant Total conservation: totalExpenses === sum(all expense amounts)
 * @invariant Classification completeness: every expense in exactly one category
 *
 * @returns Promise resolving to SettlementSummary with:
 *   - balances: Adjusted participant balances (after recorded settlements)
 *   - settlements: Suggested settlements to settle remaining debts (optimized)
 *   - totalExpenses: Sum of all expense amounts in trip currency
 *   - currency: Trip currency code
 *   - splitExpensesTotal: Sum of expenses with 2+ participants or payer != beneficiary
 *   - personalExpensesTotal: Sum of expenses where payer === sole beneficiary
 *   - unsplitExpensesTotal: Sum of expenses with no participants
 *   - unsplitExpensesCount: Number of unallocated expenses
 *   - unsplitExpenseIds: IDs of unallocated expenses (for troubleshooting)
 *   - recordedSettlements: Previously recorded settlement payments
 *
 * @example
 * // Normal case: trip with expenses and participants
 * const summary = await computeSettlement('trip-123');
 * // summary.balances: [{ participantId: 'p1', netPosition: 500, ... }, ...]
 * // summary.settlements: [{ from: 'p2', to: 'p1', amount: 500 }]
 * // summary.totalExpenses: 1000
 * // summary.currency: "USD"
 *
 * @example
 * // Edge case: no participants
 * const summary = await computeSettlement('trip-no-participants');
 * // summary.balances: []
 * // summary.settlements: []
 * // summary.totalExpenses: 500 (preserved for auditing)
 * // summary.unsplitExpensesTotal: 500
 *
 * @example
 * // With recorded settlements
 * const summary = await computeSettlement('trip-with-payments');
 * // summary.balances: adjusted balances after recorded payments
 * // summary.settlements: optimized settlements for remaining balance
 * // summary.recordedSettlements: [{id: 's1', amount: 300, ...}]
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
