/**
 * SETTLEMENT MODULE - Balance Calculation
 * MODELER: Deterministic balance computation
 * PURE FUNCTION: No side effects, same inputs → same outputs
 */

import { Expense, ExpenseSplit } from "../../expenses/types";
import { Participant } from "../../participants/types";
import { ParticipantBalance } from "../types";
import { normalizeShares } from "./normalize-shares";
import { createAppError } from "@utils/errors";

/**
 * Calculates net positions for all participants in a trip.
 *
 * Net position = total paid - total owed:
 * - Positive: participant is owed money (creditor)
 * - Negative: participant owes money (debtor)
 * - Zero: participant is settled
 *
 * Processes all expenses and their splits to determine who paid what and who owes what.
 * Validates that all participants and payers exist before processing.
 *
 * @param expenses - All expenses for the trip (uses amount and paidBy fields)
 * @param splits - All expense splits (must include all splits for all expenses)
 * @param participants - All participants in the trip
 *
 * @precondition All splits.participantId must reference valid participant IDs
 * @precondition All expenses.paidBy must reference valid participant IDs
 * @precondition expenses and splits must be for the same set of expenseIds
 * @precondition All expense amounts must be non-negative integers (cents)
 *
 * @postcondition Sum of all netPosition values equals zero (balanced)
 * @postcondition Array length equals participants.length
 * @postcondition Results sorted by participantId (deterministic order)
 * @postcondition Each participant appears exactly once in results
 * @postcondition totalPaid and totalOwed are non-negative for all participants
 *
 * @invariant Conservation of money: sum(netPositions) === 0
 * @invariant For each expense: sum(split amounts) === expense.amount
 * @invariant Deterministic output: same inputs always produce same results
 *
 * @throws {AppError} INVALID_PARTICIPANT_IDS - If splits reference non-existent participants
 * @throws {AppError} INVALID_PARTICIPANT_IDS - If expenses reference non-existent payers
 *
 * @returns Array of participant balances, sorted by participantId for determinism
 *
 * @example
 * const participants = [
 *   { id: 'p1', name: 'Alice' },
 *   { id: 'p2', name: 'Bob' }
 * ];
 * const expenses = [
 *   { id: 'e1', amount: 1000, paidBy: 'p1' }
 * ];
 * const splits = [
 *   { expenseId: 'e1', participantId: 'p1', shareType: 'equal', share: 1 },
 *   { expenseId: 'e1', participantId: 'p2', shareType: 'equal', share: 1 }
 * ];
 * const balances = calculateBalances(expenses, splits, participants);
 * // balances[0]: { participantId: 'p1', netPosition: 500, totalPaid: 1000, totalOwed: 500 }
 * // balances[1]: { participantId: 'p2', netPosition: -500, totalPaid: 0, totalOwed: 500 }
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
    throw createAppError(
      "INVALID_PARTICIPANT_IDS",
      `Invalid participant IDs found in expense splits: ${Array.from(invalidParticipantIds).join(", ")}`,
      {
        details: {
          invalidParticipantIds: Array.from(invalidParticipantIds),
        },
      },
    );
  }

  // Validate all payers exist
  const invalidPayerIds = new Set<string>();
  expenses.forEach((expense) => {
    if (!validParticipantIds.has(expense.paidBy)) {
      invalidPayerIds.add(expense.paidBy);
    }
  });

  if (invalidPayerIds.size > 0) {
    throw createAppError(
      "INVALID_PARTICIPANT_IDS",
      `Invalid payer IDs found in expenses: ${Array.from(invalidPayerIds).join(", ")}`,
      {
        details: {
          invalidParticipantIds: Array.from(invalidPayerIds),
        },
      },
    );
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
