/**
 * FORMATTING UTILITIES
 * Centralized number formatting with consistent decimal precision
 *
 * Single source of truth for display formatting across UI components.
 * Ensures consistent decimal places for exchange rates, percentages, and amounts.
 */

/**
 * Formats an exchange rate with 4 decimal places
 *
 * @param rate - Exchange rate value
 * @returns Formatted rate string with 4 decimals
 *
 * @example
 * formatFxRate(1.1234) // "1.1234"
 * formatFxRate(0.85) // "0.8500"
 */
export function formatFxRate(rate: number): string {
  return rate.toFixed(4);
}

/**
 * Formats a percentage with 1 decimal place
 *
 * @param pct - Percentage value (0-100)
 * @param includeSymbol - Whether to append "%" symbol (default: true)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(33.3) // "33.3%"
 * formatPercentage(50, false) // "50.0"
 * formatPercentage(66.67) // "66.7%"
 */
export function formatPercentage(
  pct: number,
  includeSymbol: boolean = true,
): string {
  const formatted = pct.toFixed(1);
  return includeSymbol ? `${formatted}%` : formatted;
}

/**
 * Formats an amount in minor units (cents) to major units with currency
 *
 * @param minor - Amount in minor units (cents)
 * @param currency - Currency code (e.g., "USD", "EUR")
 * @returns Formatted amount with currency prefix
 *
 * @example
 * formatAmount(1234, "USD") // "USD 12.34"
 * formatAmount(500, "EUR") // "EUR 5.00"
 */
export function formatAmount(minor: number, currency: string): string {
  const major = (minor / 100).toFixed(2);
  return `${currency} ${major}`;
}

/**
 * Formats an amount for input fields (no currency prefix)
 * Converts from minor units (cents) to major units with 2 decimal places
 *
 * @param minor - Amount in minor units (cents)
 * @returns Formatted amount string without currency
 *
 * @example
 * formatAmountInput(1234) // "12.34"
 * formatAmountInput(500) // "5.00"
 * formatAmountInput(0) // "0.00"
 */
export function formatAmountInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

/**
 * Formats a major unit amount with 2 decimal places
 * For displaying amounts that are already in major units (dollars, euros, etc.)
 *
 * @param major - Amount in major units
 * @returns Formatted amount string with 2 decimals
 *
 * @example
 * formatMajorAmount(12.34) // "12.34"
 * formatMajorAmount(5) // "5.00"
 */
export function formatMajorAmount(major: number): string {
  return major.toFixed(2);
}
