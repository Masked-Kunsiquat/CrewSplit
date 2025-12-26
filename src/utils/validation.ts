/**
 * VALIDATION UTILITIES
 * Centralized validation logic for percentages, weights, and numeric inputs
 *
 * Single source of truth for validation tolerances and logic used across
 * expense splits, settlement calculations, and UI input validation.
 */

/**
 * Tolerance for percentage sum validation (allows 99.99 - 100.01)
 *
 * Uses 0.01 as base tolerance to handle typical rounding in UI inputs,
 * while adding EPSILON * 100 provides additional buffer for accumulated
 * floating-point errors in percentage calculations.
 */
export const PERCENTAGE_TOLERANCE = 0.01 + Number.EPSILON * 100;

/**
 * Validates that a percentage sum is approximately 100%
 * Allows small floating-point precision errors within PERCENTAGE_TOLERANCE
 *
 * @param total - The sum of percentages to validate
 * @returns true if total is within tolerance of 100, false otherwise
 *
 * @example
 * isValidPercentageSum(100) // true
 * isValidPercentageSum(99.99) // true
 * isValidPercentageSum(100.01) // true
 * isValidPercentageSum(98.5) // false
 */
export function isValidPercentageSum(total: number): boolean {
  return Math.abs(total - 100) <= PERCENTAGE_TOLERANCE;
}

/**
 * Safely parses a number from string or number input
 * Returns null if not a finite number (NaN, Infinity, etc.)
 *
 * @param value - String or number to parse
 * @returns Parsed finite number, or null if invalid
 *
 * @example
 * parseFiniteNumber("42.5") // 42.5
 * parseFiniteNumber(42.5) // 42.5
 * parseFiniteNumber("abc") // null
 * parseFiniteNumber(NaN) // null
 * parseFiniteNumber(Infinity) // null
 */
export function parseFiniteNumber(value: string | number): number | null {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(num) ? num : null;
}

/**
 * Validates that a weight is positive and finite
 * Used for weighted expense splits to ensure valid distribution ratios
 *
 * @param weight - The weight value to validate
 * @returns true if weight is a finite positive number, false otherwise
 *
 * @example
 * isValidWeight(1) // true
 * isValidWeight(2.5) // true
 * isValidWeight(0) // false
 * isValidWeight(-1) // false
 * isValidWeight(NaN) // false
 * isValidWeight(Infinity) // false
 */
export function isValidWeight(weight: number): boolean {
  return Number.isFinite(weight) && weight > 0;
}
