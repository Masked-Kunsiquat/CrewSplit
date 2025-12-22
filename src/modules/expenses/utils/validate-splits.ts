/**
 * EXPENSES MODULE - Split Validation Utility
 * Validates expense split configurations for different split types
 */

import { parseCurrency } from "@utils/currency";
import type { SplitType } from "@ui/components";

export interface SplitValidationResult {
  isValid: boolean;
  error?: string;
  current?: number;
  target?: number;
}

/**
 * Validates expense splits based on split type and participant selections
 *
 * @param selectedParticipants - Set of selected participant IDs
 * @param splitType - Type of split (equal, percentage, weight, amount)
 * @param splitValues - Map of participant ID to their split value (as string)
 * @param expenseAmount - Total expense amount as string
 * @returns Validation result with isValid flag and optional error message
 *
 * @example
 * const result = validateExpenseSplits(
 *   new Set(['p1', 'p2']),
 *   'percentage',
 *   { 'p1': '60', 'p2': '40' },
 *   '100.00'
 * );
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 */
export function validateExpenseSplits(
  selectedParticipants: Set<string>,
  splitType: SplitType,
  splitValues: Record<string, string>,
  expenseAmount: string,
): SplitValidationResult {
  const selectedCount = selectedParticipants.size;

  // Allow zero participants (unallocated expense)
  if (selectedCount === 0) {
    return { isValid: true };
  }

  const expenseAmountMinor = parseCurrency(expenseAmount);

  // Equal splits require no validation
  if (splitType === "equal") {
    return { isValid: true };
  }

  // Validate weight splits
  if (splitType === "weight") {
    // Validate each weight is a finite positive number
    for (const pid of selectedParticipants) {
      const value = parseFloat(splitValues[pid] || "1");
      if (!Number.isFinite(value) || value <= 0) {
        return {
          isValid: false,
          error: "Weights must be positive numbers",
        };
      }
    }
    return { isValid: true };
  }

  // Validate percentage splits
  if (splitType === "percentage") {
    // Validate each percentage is finite and within 0-100
    for (const pid of selectedParticipants) {
      const value = parseFloat(splitValues[pid] || "0");
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return {
          isValid: false,
          error: "Each percentage must be between 0 and 100",
        };
      }
    }

    // Check that percentages sum to 100
    const total = Array.from(selectedParticipants).reduce((sum, pid) => {
      const value = parseFloat(splitValues[pid] || "0");
      return sum + value;
    }, 0);

    const isValid = Math.abs(total - 100) < 0.01; // Allow small floating point errors
    return {
      isValid,
      error: isValid
        ? undefined
        : `Percentages must add up to 100% (currently ${total.toFixed(1)}%)`,
      current: total,
      target: 100,
    };
  }

  // Validate amount splits
  if (splitType === "amount") {
    // Validate each split amount is finite and non-negative
    for (const pid of selectedParticipants) {
      const valueStr = splitValues[pid] || "0";
      const value = parseCurrency(valueStr);
      if (!Number.isFinite(value) || value < 0) {
        return {
          isValid: false,
          error: "Split amounts must be non-negative",
        };
      }
    }

    // Check that split amounts sum to expense total
    const total = Array.from(selectedParticipants).reduce((sum, pid) => {
      const value = parseCurrency(splitValues[pid] || "0");
      return sum + value;
    }, 0);

    const isValid = total === expenseAmountMinor;
    return {
      isValid,
      error: isValid ? undefined : "Split amounts must equal expense total",
      current: total,
      target: expenseAmountMinor,
    };
  }

  return { isValid: true };
}
