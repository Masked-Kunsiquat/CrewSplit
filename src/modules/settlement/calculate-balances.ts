/**
 * SETTLEMENT MODULE - Balance Calculation
 * MODELER: Deterministic balance computation
 * PURE FUNCTION: No side effects, same inputs → same outputs
 */

import { Expense, ExpenseSplit } from '../expenses/types';
import { Participant } from '../participants/types';
import { ParticipantBalance } from './types';
import { normalizeShares } from './normalize-shares';

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
 */
export const calculateBalances = (
  expenses: Expense[],
  splits: ExpenseSplit[],
  participants: Participant[]
): ParticipantBalance[] => {
  // Initialize balance map for all participants
  const balanceMap = new Map<string, { totalPaid: number; totalOwed: number }>();

  participants.forEach(p => {
    balanceMap.set(p.id, { totalPaid: 0, totalOwed: 0 });
  });

  // Group splits by expense
  const splitsByExpense = new Map<string, ExpenseSplit[]>();
  splits.forEach(split => {
    if (!splitsByExpense.has(split.expenseId)) {
      splitsByExpense.set(split.expenseId, []);
    }
    splitsByExpense.get(split.expenseId)!.push(split);
  });

  // Process each expense
  expenses.forEach(expense => {
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

  participants.forEach(p => {
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
