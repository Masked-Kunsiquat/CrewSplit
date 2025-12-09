/**
 * SETTLEMENT MODULE - Balance Calculation
 * MODELER: Deterministic balance computation
 * Pure function: same inputs → same outputs
 */

import { Expense, ExpenseSplit } from '../expenses/types';
import { Participant } from '../participants/types';
import { ParticipantBalance } from './types';

/**
 * Calculate net positions for all participants in a trip
 * @param expenses - All expenses for the trip
 * @param splits - All expense splits
 * @param participants - All participants
 * @returns Array of participant balances
 */
export const calculateBalances = (
  expenses: Expense[],
  splits: ExpenseSplit[],
  participants: Participant[]
): ParticipantBalance[] => {
  // TODO: MODELER implements this
  // 1. For each participant, sum totalPaid (expenses they paid)
  // 2. For each participant, sum totalOwed (normalized splits)
  // 3. netPosition = totalPaid - totalOwed
  // Must be deterministic and fully auditable

  return [];
};
