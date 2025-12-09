/**
 * UTILITIES - Currency Formatting
 */

/**
 * Format cents to currency string
 * @param cents - Amount in cents
 * @param currency - ISO 4217 currency code
 * @returns Formatted string (e.g., "$12.34")
 */
export const formatCurrency = (cents: number, currency: string = 'USD'): string => {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Parse currency input to cents
 * @param input - String input from user
 * @returns Amount in cents
 */
export const parseCurrency = (input: string): number => {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const amount = parseFloat(cleaned) || 0;
  return Math.round(amount * 100);
};
