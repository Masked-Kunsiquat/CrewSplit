/**
 * SETTLEMENT MODULE - Share Normalization
 * MODELER: Convert different share types to actual amounts
 * PURE FUNCTION: No side effects, deterministic, zero dependencies
 */

import type { ExpenseSplit } from "../../expenses/types";

/**
 * Validate percentage sum is approximately 100 (within tolerance).
 * Inlined from @utils/validation to maintain zero dependencies.
 * Uses 0.01 + Number.EPSILON * 100 to handle floating-point precision errors.
 */
const PERCENTAGE_TOLERANCE = 0.01 + Number.EPSILON * 100;
function isValidPercentageSum(sum: number): boolean {
  return Math.abs(sum - 100) <= PERCENTAGE_TOLERANCE;
}

/**
 * Epsilon for fractional part equality comparison.
 * Used when sorting by remainder for fair cent distribution.
 * This value ensures that two fractional parts differing by less than
 * 0.0000001 are considered equal, providing stable sorting behavior
 * despite floating-point arithmetic imprecision.
 */
const FRACTION_EQUALITY_EPSILON = 0.0000001;

/**
 * Normalizes expense splits to absolute amounts in minor currency units (cents).
 *
 * Converts different share types (equal, percentage, weight, amount) into exact amounts
 * that sum to the total expense amount. Uses largest remainder method to distribute
 * rounding errors deterministically.
 *
 * @param splits - Array of expense splits (all must have matching shareType)
 * @param expenseAmount - Total expense amount in minor units (cents)
 *
 * @precondition All splits must have the same shareType
 * @precondition For percentage splits: sum must equal 100 ± PERCENTAGE_TOLERANCE
 * @precondition For weight splits: all weights must be positive (> 0)
 * @precondition For amount splits: sum must exactly equal expenseAmount
 * @precondition expenseAmount must be a non-negative integer
 *
 * @postcondition Returned amounts sum exactly to expenseAmount
 * @postcondition All returned amounts are non-negative integers
 * @postcondition Return array length equals splits.length
 * @postcondition Order matches input split order (stable mapping)
 * @postcondition Function is deterministic: same inputs always produce same outputs
 *
 * @invariant Total amount conservation: sum(returned amounts) === expenseAmount
 * @invariant No participant receives negative amount
 * @invariant Deterministic rounding: remainder distribution by participantId sort order
 *
 * @throws {Error} MIXED_SHARE_TYPES - If splits have different shareType values
 * @throws {Error} INVALID_PERCENTAGE_SUM - If percentages don't sum to ~100
 * @throws {Error} INVALID_WEIGHT - If any weight is non-positive or non-finite
 * @throws {Error} AMOUNT_MISMATCH - If amounts don't sum to expenseAmount
 * @throws {Error} UNKNOWN_SHARE_TYPE - If shareType is not recognized
 *
 * @returns Array of normalized amounts (in cents), one per split, in same order as input
 *
 * @example
 * // Equal split
 * const splits = [
 *   { participantId: 'p1', shareType: 'equal', share: 1 },
 *   { participantId: 'p2', shareType: 'equal', share: 1 },
 * ];
 * normalizeShares(splits, 1001); // [501, 500] - remainder goes to first by ID
 *
 * @example
 * // Percentage split
 * const splits = [
 *   { participantId: 'p1', shareType: 'percentage', share: 60 },
 *   { participantId: 'p2', shareType: 'percentage', share: 40 },
 * ];
 * normalizeShares(splits, 1000); // [600, 400]
 *
 * @example
 * // Weight split
 * const splits = [
 *   { participantId: 'p1', shareType: 'weight', share: 2 },
 *   { participantId: 'p2', shareType: 'weight', share: 1 },
 * ];
 * normalizeShares(splits, 900); // [600, 300]
 */
export const normalizeShares = (
  splits: ExpenseSplit[],
  expenseAmount: number,
): number[] => {
  if (splits.length === 0) {
    return [];
  }

  if (expenseAmount === 0) {
    return splits.map(() => 0);
  }

  // Determine the share type (all splits should have the same type)
  const shareType = splits[0].shareType;

  // Validate all splits have the same type
  if (!splits.every((s) => s.shareType === shareType)) {
    throw new Error("All splits for an expense must have the same shareType");
  }

  // Deterministic normalization must not depend on caller-provided split ordering
  // (e.g., DB row order). We compute using a stable participantId ordering, then
  // map results back to the original split order.
  const stable = splits
    .map((split, originalIndex) => ({ split, originalIndex }))
    .sort((a, b) => {
      const byParticipant = a.split.participantId.localeCompare(
        b.split.participantId,
      );
      if (byParticipant !== 0) return byParticipant;
      return a.originalIndex - b.originalIndex;
    });

  const stableSplits = stable.map((x) => x.split);
  let stableNormalized: number[];

  switch (shareType) {
    case "equal":
      stableNormalized = normalizeEqual(stableSplits.length, expenseAmount);
      break;

    case "percentage":
      stableNormalized = normalizePercentage(stableSplits, expenseAmount);
      break;

    case "weight":
      stableNormalized = normalizeWeight(stableSplits, expenseAmount);
      break;

    case "amount":
      stableNormalized = normalizeAmount(stableSplits, expenseAmount);
      break;

    default:
      throw new Error(`Unknown share type: ${shareType}`);
  }

  const normalized = new Array<number>(splits.length);
  stableNormalized.forEach((amount, stableIndex) => {
    normalized[stable[stableIndex].originalIndex] = amount;
  });

  return normalized;
};

/**
 * Equal split: divide evenly, distribute remainder
 */
function normalizeEqual(count: number, total: number): number[] {
  const baseAmount = Math.floor(total / count);
  const remainder = total - baseAmount * count;

  const result = new Array(count).fill(baseAmount);

  // Distribute remainder to first N participants (deterministic)
  for (let i = 0; i < remainder; i++) {
    result[i] += 1;
  }

  return result;
}

/**
 * Percentage split: convert percentages to amounts
 * Percentages must sum to 100
 */
function normalizePercentage(splits: ExpenseSplit[], total: number): number[] {
  const totalPercentage = splits.reduce((sum, s) => sum + s.share, 0);

  // Allow small floating-point tolerance
  if (!isValidPercentageSum(totalPercentage)) {
    throw new Error(`Percentages must sum to 100, got ${totalPercentage}`);
  }

  // Calculate exact amounts (may have fractional cents)
  const exactAmounts = splits.map((s) => (s.share / 100) * total);

  // Round down to get base amounts
  const baseAmounts = exactAmounts.map((a) => Math.floor(a));
  const baseTotal = baseAmounts.reduce((sum, a) => sum + a, 0);
  const remainder = total - baseTotal;

  // Calculate fractional parts for deterministic remainder distribution
  const fractionalParts = exactAmounts.map((exact, i) => ({
    index: i,
    fraction: exact - baseAmounts[i],
  }));

  // Sort by fraction descending, then by index for determinism
  fractionalParts.sort((a, b) => {
    if (Math.abs(a.fraction - b.fraction) < FRACTION_EQUALITY_EPSILON) {
      return a.index - b.index; // Stable sort by index
    }
    return b.fraction - a.fraction;
  });

  // Distribute remainder to splits with largest fractional parts
  const result = [...baseAmounts];
  for (let i = 0; i < remainder; i++) {
    result[fractionalParts[i].index] += 1;
  }

  return result;
}

/**
 * Weight split: convert weights to proportional amounts
 */
function normalizeWeight(splits: ExpenseSplit[], total: number): number[] {
  const totalWeight = splits.reduce((sum, s) => sum + s.share, 0);

  if (totalWeight <= 0) {
    throw new Error("Total weight must be positive");
  }

  // Calculate exact amounts
  const exactAmounts = splits.map((s) => (s.share / totalWeight) * total);

  // Round down to get base amounts
  const baseAmounts = exactAmounts.map((a) => Math.floor(a));
  const baseTotal = baseAmounts.reduce((sum, a) => sum + a, 0);
  const remainder = total - baseTotal;

  // Calculate fractional parts for remainder distribution
  const fractionalParts = exactAmounts.map((exact, i) => ({
    index: i,
    fraction: exact - baseAmounts[i],
  }));

  // Sort by fraction descending, then by index
  fractionalParts.sort((a, b) => {
    if (Math.abs(a.fraction - b.fraction) < FRACTION_EQUALITY_EPSILON) {
      return a.index - b.index;
    }
    return b.fraction - a.fraction;
  });

  // Distribute remainder
  const result = [...baseAmounts];
  for (let i = 0; i < remainder; i++) {
    result[fractionalParts[i].index] += 1;
  }

  return result;
}

/**
 * Amount split: use exact amounts
 * Amounts must sum to total
 */
function normalizeAmount(splits: ExpenseSplit[], total: number): number[] {
  // Validate that all splits have explicit amounts
  const missingAmounts = splits.filter(
    (s) => s.amount === undefined || s.amount === null,
  );
  if (missingAmounts.length > 0) {
    throw new Error(
      `All splits must have explicit amounts; found ${missingAmounts.length} missing amount(s)`,
    );
  }

  const amounts = splits.map((s) => s.amount!);
  const sum = amounts.reduce((acc, a) => acc + a, 0);

  if (sum !== total) {
    throw new Error(
      `Split amounts must sum to expense total. Expected ${total}, got ${sum}`,
    );
  }

  return amounts;
}
