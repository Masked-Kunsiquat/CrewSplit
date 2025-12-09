/**
 * SETTLEMENT MODULE - Transaction Minimization
 * MODELER: Greedy algorithm for optimal settlements
 * PURE FUNCTION: Deterministic ordering, no side effects
 */

import { ParticipantBalance, Settlement } from './types';

/**
 * Account type for internal tracking during settlement optimization
 */
interface Account {
  participantId: string;
  participantName: string;
  amount: number; // Positive for creditors, negative for debtors
}

/**
 * Minimize transactions using greedy algorithm
 * Always matches largest creditor with largest debtor
 *
 * Algorithm:
 * 1. Separate participants into creditors (owed money) and debtors (owe money)
 * 2. Sort both by absolute value descending, then by ID for determinism
 * 3. Match largest creditor with largest debtor
 * 4. Create settlement for min(creditor amount, abs(debtor amount))
 * 5. Repeat until all balanced (net positions sum to zero)
 *
 * @param balances - Participant balances (must be pre-calculated)
 * @returns Minimal list of settlements, deterministically ordered
 */
export const optimizeSettlements = (balances: ParticipantBalance[]): Settlement[] => {
  const settlements: Settlement[] = [];

  // Create working copies of accounts with non-zero balances
  const creditors: Account[] = [];
  const debtors: Account[] = [];

  balances.forEach(balance => {
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
