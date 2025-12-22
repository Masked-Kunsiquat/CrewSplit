/**
 * SETTLEMENT MODULE - Balance Calculation
 * MODELER: Deterministic balance computation
 * PURE FUNCTION: No side effects, same inputs → same outputs
 */

import { Expense, ExpenseSplit } from "../../expenses/types";
import { Participant } from "../../participants/types";
import { ParticipantBalance } from "../types";
import { normalizeShares } from "./normalize-shares";

/**
 * Calculate net positions for all participants in a trip
 * Net position = total paid - total owed
 * - Positive: participant is owed money (creditor)
 * - Negative: participant owes money (debtor)
 * - Zero: participant is settled
 *
 * @param expenses - All expenses for the trip
 * @param splits - All expense splits (must include all splits for all expenses)
 * @param participants - All participants
 * @returns Array of participant balances, sorted by participantId for determinism
 * @throws Error with code 'INVALID_PARTICIPANT_IDS' if splits reference non-existent participants
 */
export const calculateBalances = (
  expenses: Expense[],
  splits: ExpenseSplit[],
  participants: Participant[],
): ParticipantBalance[] => {
  // Initialize balance map for all participants
  const balanceMap = new Map<
    string,
    { totalPaid: number; totalOwed: number }
  >();
  const validParticipantIds = new Set<string>();

  participants.forEach((p) => {
    balanceMap.set(p.id, { totalPaid: 0, totalOwed: 0 });
    validParticipantIds.add(p.id);
  });

  // Validate all splits reference valid participants
  const invalidParticipantIds = new Set<string>();
  splits.forEach((split) => {
    if (!validParticipantIds.has(split.participantId)) {
      invalidParticipantIds.add(split.participantId);
    }
  });

  if (invalidParticipantIds.size > 0) {
    const error = new Error(
      `Invalid participant IDs found in expense splits: ${Array.from(invalidParticipantIds).join(", ")}`,
    ) as Error & { code: string; invalidParticipantIds: string[] };
    error.code = "INVALID_PARTICIPANT_IDS";
    error.invalidParticipantIds = Array.from(invalidParticipantIds);
    throw error;
  }

  // Validate all payers exist
  const invalidPayerIds = new Set<string>();
  expenses.forEach((expense) => {
    if (!validParticipantIds.has(expense.paidBy)) {
      invalidPayerIds.add(expense.paidBy);
    }
  });

  if (invalidPayerIds.size > 0) {
    const error = new Error(
      `Invalid payer IDs found in expenses: ${Array.from(invalidPayerIds).join(", ")}`,
    ) as Error & { code: string; invalidParticipantIds: string[] };
    error.code = "INVALID_PARTICIPANT_IDS";
    error.invalidParticipantIds = Array.from(invalidPayerIds);
    throw error;
  }

  // Group splits by expense
  const splitsByExpense = new Map<string, ExpenseSplit[]>();
  splits.forEach((split) => {
    if (!splitsByExpense.has(split.expenseId)) {
      splitsByExpense.set(split.expenseId, []);
    }
    splitsByExpense.get(split.expenseId)!.push(split);
  });

  // Process each expense
  expenses.forEach((expense) => {
    const expenseSplits = splitsByExpense.get(expense.id) || [];

    if (expenseSplits.length === 0) {
      // No splits for this expense - skip it
      return;
    }

    // Normalize splits to get actual amounts each participant owes
    const normalizedAmounts = normalizeShares(expenseSplits, expense.amount);

    // Add to totalPaid for the payer
    const payerBalance = balanceMap.get(expense.paidBy);
    if (payerBalance) {
      payerBalance.totalPaid += expense.amount;
    }

    // Add to totalOwed for each participant in the split
    expenseSplits.forEach((split, index) => {
      const participantBalance = balanceMap.get(split.participantId);
      if (participantBalance) {
        participantBalance.totalOwed += normalizedAmounts[index];
      }
    });
  });

  // Convert to ParticipantBalance array
  const balances: ParticipantBalance[] = [];

  participants.forEach((p) => {
    const balance = balanceMap.get(p.id);
    if (balance) {
      balances.push({
        participantId: p.id,
        participantName: p.name,
        netPosition: balance.totalPaid - balance.totalOwed,
        totalPaid: balance.totalPaid,
        totalOwed: balance.totalOwed,
      });
    }
  });

  // Sort by participantId for deterministic output
  balances.sort((a, b) => a.participantId.localeCompare(b.participantId));

  return balances;
};
