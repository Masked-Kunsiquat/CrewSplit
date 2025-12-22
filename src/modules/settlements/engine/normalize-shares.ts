/**
 * SETTLEMENT MODULE - Share Normalization
 * MODELER: Convert different share types to actual amounts
 * PURE FUNCTION: No side effects, deterministic
 */

import { ExpenseSplit } from "../../expenses/types";

/**
 * Normalize different split types to actual amounts in cents
 * Handles rounding by distributing remainders to ensure sum equals total
 *
 * @param splits - Array of splits for a single expense
 * @param expenseAmount - Total expense amount in cents
 * @returns Array of normalized amounts (one per split) that sum to expenseAmount
 *
 * @throws Error if splits are invalid (e.g., percentages > 100, amounts don't sum)
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

  // Allow small floating-point tolerance (0.01 with epsilon for floating-point errors)
  const tolerance = 0.01 + Number.EPSILON * 100;
  if (Math.abs(totalPercentage - 100) > tolerance) {
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
    if (Math.abs(a.fraction - b.fraction) < 0.0000001) {
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
    if (Math.abs(a.fraction - b.fraction) < 0.0000001) {
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
