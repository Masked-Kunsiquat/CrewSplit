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
 * Validates that a percentage sum is approximately 100%.
 *
 * Allows small floating-point precision errors within PERCENTAGE_TOLERANCE (±0.01).
 * Used to validate percentage-based expense splits and ensure fair distribution.
 *
 * @param total - The sum of percentages to validate
 *
 * @precondition total should be a finite number
 * @precondition total should be the sum of user-provided percentages
 *
 * @postcondition Returns true if 99.99 ≤ total ≤ 100.01
 * @postcondition Returns false if total is outside tolerance range
 * @postcondition Function is pure: same input always returns same output
 *
 * @invariant PERCENTAGE_TOLERANCE is constant (0.01 + Number.EPSILON * 100)
 * @invariant Symmetric around 100: distance from 100 determines validity
 *
 * @returns true if total is within tolerance of 100, false otherwise
 *
 * @example
 * isValidPercentageSum(100)    // true - exact
 * isValidPercentageSum(99.99)  // true - within tolerance
 * isValidPercentageSum(100.01) // true - within tolerance
 * isValidPercentageSum(98.5)   // false - outside tolerance
 * isValidPercentageSum(101.5)  // false - outside tolerance
 */
export function isValidPercentageSum(total: number): boolean {
  return Math.abs(total - 100) <= PERCENTAGE_TOLERANCE;
}

/**
 * Safely parses a number from string or number input.
 *
 * Returns null for invalid inputs (NaN, Infinity, -Infinity, non-numeric strings).
 * Used for validating user input in forms and preventing runtime errors from invalid numbers.
 *
 * @param value - String or number to parse
 *
 * @precondition value can be any string or number type
 *
 * @postcondition Returns finite number if value is valid numeric
 * @postcondition Returns null if value is NaN, Infinity, -Infinity, or unparseable string
 * @postcondition Never throws an error (safe for all inputs)
 * @postcondition Function is pure: same input always returns same output
 *
 * @invariant Number.isFinite() determines validity (excludes NaN and Infinity)
 * @invariant String inputs parsed with parseFloat() before validation
 *
 * @returns Parsed finite number, or null if invalid
 *
 * @example
 * parseFiniteNumber("42.5")    // 42.5
 * parseFiniteNumber(42.5)      // 42.5
 * parseFiniteNumber("abc")     // null - unparseable
 * parseFiniteNumber(NaN)       // null - not finite
 * parseFiniteNumber(Infinity)  // null - not finite
 * parseFiniteNumber("-123.45") // -123.45
 */
export function parseFiniteNumber(value: string | number): number | null {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(num) ? num : null;
}

/**
 * Validates that a weight is positive and finite.
 *
 * Used for weighted expense splits to ensure valid distribution ratios.
 * Weights must be positive (> 0) to have meaningful proportional splits.
 *
 * @param weight - The weight value to validate
 *
 * @precondition weight is a number type (may be any numeric value)
 *
 * @postcondition Returns true only if weight is finite and strictly greater than 0
 * @postcondition Returns false if weight ≤ 0, NaN, or Infinity
 * @postcondition Function is pure: same input always returns same output
 *
 * @invariant Zero is invalid (no contribution = no valid weight)
 * @invariant Negative weights are invalid (proportions must be positive)
 * @invariant NaN and Infinity are invalid (must be finite number)
 *
 * @returns true if weight is a finite positive number, false otherwise
 *
 * @example
 * isValidWeight(1)        // true - positive integer
 * isValidWeight(2.5)      // true - positive decimal
 * isValidWeight(0.001)    // true - small but positive
 * isValidWeight(0)        // false - zero not allowed
 * isValidWeight(-1)       // false - negative not allowed
 * isValidWeight(NaN)      // false - not finite
 * isValidWeight(Infinity) // false - not finite
 */
export function isValidWeight(weight: number): boolean {
  return Number.isFinite(weight) && weight > 0;
}
