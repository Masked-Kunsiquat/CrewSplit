/**
 * EXPENSES MODULE - Build Expense Splits Utility
 * Constructs expense split objects from form data
 */

import { parseCurrency } from "@utils/currency";
import type { SplitType } from "@ui/components";

export interface ExpenseSplit {
  participantId: string;
  share: number;
  shareType: "equal" | "percentage" | "weight" | "amount";
  amount?: number;
}

/**
 * Builds expense split objects from participant selections and split values
 *
 * @param selectedParticipants - Set of selected participant IDs
 * @param splitType - Type of split (equal, percentage, weight, amount)
 * @param splitValues - Map of participant ID to their split value (as string)
 * @returns Array of expense split objects
 * @throws Error if validation fails (invalid percentages, weights, or amounts)
 *
 * @example
 * const splits = buildExpenseSplits(
 *   new Set(['p1', 'p2']),
 *   'percentage',
 *   { 'p1': '60', 'p2': '40' }
 * );
 * // Returns: [
 * //   { participantId: 'p1', share: 60, shareType: 'percentage' },
 * //   { participantId: 'p2', share: 40, shareType: 'percentage' }
 * // ]
 */
export function buildExpenseSplits(
  selectedParticipants: Set<string>,
  splitType: SplitType,
  splitValues: Record<string, string>,
): ExpenseSplit[] {
  return Array.from(selectedParticipants).map((participantId) => {
    if (splitType === "equal") {
      return {
        participantId,
        share: 1,
        shareType: "equal" as const,
      };
    }

    if (splitType === "percentage") {
      const percentage = parseFloat(splitValues[participantId] || "0");
      // Validate percentage is finite and within bounds
      if (
        !Number.isFinite(percentage) ||
        percentage < 0 ||
        percentage > 100
      ) {
        throw new Error("Each percentage must be between 0 and 100");
      }
      return {
        participantId,
        share: percentage,
        shareType: "percentage" as const,
      };
    }

    if (splitType === "weight") {
      const weight = parseFloat(splitValues[participantId] || "1");
      // Validate weight is finite and positive
      if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error("Weights must be positive numbers");
      }
      return {
        participantId,
        share: weight,
        shareType: "weight" as const,
      };
    }

    if (splitType === "amount") {
      const splitAmount = parseCurrency(splitValues[participantId] || "0");
      // Validate amount is finite and non-negative
      if (!Number.isFinite(splitAmount) || splitAmount < 0) {
        throw new Error("Split amounts must be non-negative");
      }
      return {
        participantId,
        share: 0, // Not used for amount type
        shareType: "amount" as const,
        amount: splitAmount,
      };
    }

    // Fallback (should never reach here)
    return {
      participantId,
      share: 1,
      shareType: "equal" as const,
    };
  });
}

/**
 * Validates that splits sum to expected totals for percentage and amount types
 *
 * @param splits - Array of expense splits to validate
 * @param splitType - Type of split (equal, percentage, weight, amount)
 * @param expenseAmountMinor - Total expense amount in minor currency units (for amount validation)
 * @throws Error if validation fails
 *
 * @example
 * const splits = buildExpenseSplits(...);
 * validateSplitTotals(splits, 'percentage', 10000);
 * // Throws if percentages don't sum to 100
 */
export function validateSplitTotals(
  splits: ExpenseSplit[],
  splitType: SplitType,
  expenseAmountMinor: number,
): void {
  // Validate percentage sum
  if (splitType === "percentage") {
    const totalPercentage = splits.reduce((sum, split) => sum + split.share, 0);
    if (Math.abs(totalPercentage - 100) >= 0.01) {
      throw new Error(
        `Percentages must add up to 100% (currently ${totalPercentage.toFixed(1)}%)`,
      );
    }
  }

  // Validate amount sum
  if (splitType === "amount") {
    const totalAmount = splits.reduce((sum, split) => sum + (split.amount || 0), 0);
    if (totalAmount !== expenseAmountMinor) {
      throw new Error("Split amounts must equal expense total");
    }
  }
}
