/**
 * FORMATTING UTILITIES
 * Centralized number formatting with consistent decimal precision
 *
 * Single source of truth for display formatting across UI components.
 * Ensures consistent decimal places for exchange rates, percentages, and amounts.
 */

/**
 * Formats an exchange rate with 4 decimal places.
 *
 * Provides consistent precision for displaying currency conversion rates across the app.
 * Always shows exactly 4 decimal places with trailing zeros as needed.
 *
 * @param rate - Exchange rate value (typically 0.0001 to 10000)
 *
 * @precondition rate should be a finite positive number
 * @precondition rate represents a valid exchange rate (> 0)
 *
 * @postcondition Returns string with exactly 4 decimal places
 * @postcondition Rounds using standard rounding (0.5 rounds up)
 * @postcondition Includes trailing zeros (e.g., "1.2000")
 * @postcondition Function is pure: same input always returns same output
 *
 * @invariant Output format is always "X.XXXX" (4 decimal places)
 * @invariant Uses JavaScript's toFixed() rounding behavior
 *
 * @returns Formatted rate string with 4 decimals
 *
 * @example
 * formatFxRate(1.1234) // "1.1234"
 * formatFxRate(0.85)   // "0.8500"
 * formatFxRate(1.0)    // "1.0000"
 */
export function formatFxRate(rate: number): string {
  return rate.toFixed(4);
}

/**
 * Formats a percentage with 1 decimal place.
 *
 * Provides consistent formatting for percentage displays throughout the app.
 * Optionally includes "%" symbol for display contexts.
 *
 * @param pct - Percentage value (typically 0-100)
 * @param includeSymbol - Whether to append "%" symbol (default: true)
 *
 * @precondition pct should be a finite number
 * @precondition pct typically represents a percentage value (0-100)
 *
 * @postcondition Returns string with exactly 1 decimal place
 * @postcondition Rounds using standard rounding (0.05 rounds up to 0.1)
 * @postcondition Includes trailing zero if needed (e.g., "50.0")
 * @postcondition Appends "%" if includeSymbol is true
 * @postcondition Function is pure: same inputs always return same output
 *
 * @invariant Output format is "X.X" or "X.X%" (1 decimal place)
 * @invariant Uses JavaScript's toFixed() rounding behavior
 *
 * @returns Formatted percentage string with or without "%" symbol
 *
 * @example
 * formatPercentage(33.3)      // "33.3%"
 * formatPercentage(50, false) // "50.0"
 * formatPercentage(66.67)     // "66.7%" (rounded)
 * formatPercentage(100)       // "100.0%"
 */
export function formatPercentage(
  pct: number,
  includeSymbol: boolean = true,
): string {
  const formatted = pct.toFixed(1);
  return includeSymbol ? `${formatted}%` : formatted;
}

/**
 * Formats an amount in minor units (cents) to major units with currency prefix.
 *
 * @param minor - Amount in minor units (cents)
 * @param currency - Currency code (e.g., "USD", "EUR")
 *
 * @precondition minor is a non-negative integer (cents)
 * @precondition currency is a valid ISO 4217 currency code
 *
 * @postcondition Returns "CURRENCY AMOUNT" format with 2 decimals
 * @postcondition Division by 100 converts cents to dollars/euros/etc.
 * @postcondition Function is pure: same inputs always return same output
 *
 * @returns Formatted amount with currency prefix (e.g., "USD 12.34")
 *
 * @example
 * formatAmount(1234, "USD") // "USD 12.34"
 * formatAmount(500, "EUR")  // "EUR 5.00"
 */
export function formatAmount(minor: number, currency: string): string {
  const major = (minor / 100).toFixed(2);
  return `${currency} ${major}`;
}

/**
 * Formats an amount for input fields (no currency prefix).
 *
 * Converts from minor units (cents) to major units with 2 decimal places.
 * Used in form inputs where currency is shown separately.
 *
 * @param minor - Amount in minor units (cents)
 *
 * @precondition minor is a non-negative integer
 *
 * @postcondition Returns string with exactly 2 decimal places
 * @postcondition No currency prefix (just the number)
 * @postcondition Function is pure: same input always returns same output
 *
 * @returns Formatted amount string without currency (e.g., "12.34")
 *
 * @example
 * formatAmountInput(1234) // "12.34"
 * formatAmountInput(500)  // "5.00"
 * formatAmountInput(0)    // "0.00"
 */
export function formatAmountInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

/**
 * Formats a major unit amount with 2 decimal places.
 *
 * For displaying amounts that are already in major units (dollars, euros, etc.)
 * without currency conversion.
 *
 * @param major - Amount in major units
 *
 * @precondition major is a finite number
 *
 * @postcondition Returns string with exactly 2 decimal places
 * @postcondition Uses standard rounding (0.005 rounds up)
 * @postcondition Function is pure: same input always returns same output
 *
 * @returns Formatted amount string with 2 decimals (e.g., "12.34")
 *
 * @example
 * formatMajorAmount(12.34) // "12.34"
 * formatMajorAmount(5)     // "5.00"
 */
export function formatMajorAmount(major: number): string {
  return major.toFixed(2);
}
