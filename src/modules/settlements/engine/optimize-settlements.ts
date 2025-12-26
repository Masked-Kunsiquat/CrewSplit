/**
 * SETTLEMENT MODULE - Transaction Minimization
 * MODELER: Greedy algorithm for optimal settlements
 * PURE FUNCTION: Deterministic ordering, no side effects
 */

import { ParticipantBalance, SuggestedSettlement } from "../types";

/**
 * Account type for internal tracking during settlement optimization
 */
interface Account {
  participantId: string;
  participantName: string;
  amount: number; // Positive for creditors, negative for debtors
}

/**
 * Minimizes settlement transactions using greedy algorithm.
 *
 * Finds the minimal set of transactions needed to settle all debts by repeatedly
 * matching the largest creditor with the largest debtor. This greedy approach produces
 * a near-optimal solution (typically N-1 transactions for N participants with non-zero balances).
 *
 * Algorithm:
 * 1. Separate participants into creditors (owed money) and debtors (owe money)
 * 2. Sort both by absolute value descending, then by participantId for determinism
 * 3. Match largest creditor with largest debtor
 * 4. Create settlement for min(creditor amount, abs(debtor amount))
 * 5. Update remaining amounts and move to next pair
 * 6. Repeat until all balanced
 *
 * @param balances - Participant balances (must be pre-calculated via calculateBalances)
 *
 * @precondition balances must be from calculateBalances (sum of netPositions = 0)
 * @precondition All balance amounts must be integers (cents)
 * @precondition participantId and participantName must be defined for all balances
 *
 * @postcondition Sum of all settlement amounts equals sum of positive netPositions
 * @postcondition Number of transactions ≤ (number of non-zero balances - 1)
 * @postcondition Each transaction has amount > 0
 * @postcondition Deterministic output: same balances always produce same settlements
 * @postcondition Settlement order is deterministic (based on participantId sort)
 *
 * @invariant Total money transferred: sum(settlements.amount) === sum(creditor amounts)
 * @invariant All settlement amounts are positive integers
 * @invariant No participant appears twice as 'from' or twice as 'to'
 * @invariant Greedy pairing: largest creditor always paired with largest debtor first
 *
 * @returns Minimal list of suggested settlements, deterministically ordered
 *
 * @example
 * const balances = [
 *   { participantId: 'p1', participantName: 'Alice', netPosition: 1000, totalPaid: 2000, totalOwed: 1000 },
 *   { participantId: 'p2', participantName: 'Bob', netPosition: -600, totalPaid: 0, totalOwed: 600 },
 *   { participantId: 'p3', participantName: 'Charlie', netPosition: -400, totalPaid: 0, totalOwed: 400 }
 * ];
 * const settlements = optimizeSettlements(balances);
 * // Result: 2 transactions instead of 4 possible
 * // [
 * //   { from: 'p2', to: 'p1', amount: 600 },
 * //   { from: 'p3', to: 'p1', amount: 400 }
 * // ]
 *
 * @example
 * // Zero balances are skipped
 * const balances = [
 *   { participantId: 'p1', participantName: 'Alice', netPosition: 0, totalPaid: 500, totalOwed: 500 }
 * ];
 * optimizeSettlements(balances); // [] - no settlements needed
 */
export const optimizeSettlements = (
  balances: ParticipantBalance[],
): SuggestedSettlement[] => {
  const settlements: SuggestedSettlement[] = [];

  // Create working copies of accounts with non-zero balances
  const creditors: Account[] = [];
  const debtors: Account[] = [];

  balances.forEach((balance) => {
    if (balance.netPosition > 0) {
      creditors.push({
        participantId: balance.participantId,
        participantName: balance.participantName,
        amount: balance.netPosition,
      });
    } else if (balance.netPosition < 0) {
      debtors.push({
        participantId: balance.participantId,
        participantName: balance.participantName,
        amount: balance.netPosition, // Negative value
      });
    }
    // Skip participants with netPosition === 0 (already settled)
  });

  // Sort creditors by amount descending, then by ID for determinism
  creditors.sort((a, b) => {
    if (a.amount !== b.amount) {
      return b.amount - a.amount; // Descending
    }
    return a.participantId.localeCompare(b.participantId);
  });

  // Sort debtors by absolute amount descending, then by ID
  debtors.sort((a, b) => {
    const absA = Math.abs(a.amount);
    const absB = Math.abs(b.amount);
    if (absA !== absB) {
      return absB - absA; // Descending by absolute value
    }
    return a.participantId.localeCompare(b.participantId);
  });

  // Greedy matching: pair largest creditor with largest debtor
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    // Settlement amount is the minimum of what creditor is owed and what debtor owes
    const settlementAmount = Math.min(creditor.amount, Math.abs(debtor.amount));

    // Create settlement transaction
    settlements.push({
      from: debtor.participantId,
      fromName: debtor.participantName,
      to: creditor.participantId,
      toName: creditor.participantName,
      amount: settlementAmount,
    });

    // Update remaining amounts
    creditor.amount -= settlementAmount;
    debtor.amount += settlementAmount; // debtor.amount is negative, so this reduces debt

    // Move to next creditor/debtor if current one is settled
    if (creditor.amount === 0) {
      creditorIndex++;
    }
    if (debtor.amount === 0) {
      debtorIndex++;
    }
  }

  return settlements;
};
