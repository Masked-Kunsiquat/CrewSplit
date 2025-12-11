/**
 * DATABASE MAPPERS - Currency Utilities
 * LOCAL DATA ENGINEER: Helper functions for currency conversion and formatting
 */

/**
 * Currency conversion utilities for working with minor/major units
 */
export const CurrencyUtils = {
  /**
   * Convert minor units (cents) to major units (dollars)
   * @param minor - Amount in cents
   * @returns Amount in dollars
   */
  minorToMajor(minor: number): number {
    return minor / 100;
  },

  /**
   * Convert major units (dollars) to minor units (cents)
   * @param major - Amount in dollars
   * @returns Amount in cents (rounded to avoid floating point errors)
   */
  majorToMinor(major: number): number {
    return Math.round(major * 100);
  },

  /**
   * Format amount in minor units as currency string
   * @param minor - Amount in cents
   * @param currencyCode - ISO 4217 currency code (e.g., 'USD', 'EUR')
   * @returns Formatted string (e.g., "$12.34")
   */
  formatMinor(minor: number, currencyCode: string): string {
    const major = this.minorToMajor(minor);
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(major);
    } catch (error) {
      // Fallback if currency code is invalid
      return `${currencyCode} ${major.toFixed(2)}`;
    }
  },

  /**
   * Format amount in major units as currency string
   * @param major - Amount in dollars
   * @param currencyCode - ISO 4217 currency code
   * @returns Formatted string (e.g., "$12.34")
   */
  formatMajor(major: number, currencyCode: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(major);
    } catch (error) {
      // Fallback if currency code is invalid
      return `${currencyCode} ${major.toFixed(2)}`;
    }
  },

  /**
   * Apply FX rate conversion
   * @param amountMinor - Amount in cents (source currency)
   * @param fxRate - Exchange rate to target currency
   * @returns Converted amount in cents (target currency), rounded
   */
  convertWithFxRate(amountMinor: number, fxRate: number): number {
    return Math.round(amountMinor * fxRate);
  },
};
