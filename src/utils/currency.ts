/**
 * UTILITIES - Currency Formatting and Conversion
 * Centralized currency utilities for working with minor/major units and formatting
 */

/**
 * Map of ISO 4217 currency codes to their decimal places
 * Most currencies use 2 decimals, but some exceptions exist:
 * - 0 decimals: JPY, KRW, VND, etc. (amounts are whole numbers)
 * - 3 decimals: BHD, KWD, OMR, TND, JOD (amounts have 3 decimal places)
 */
const CURRENCY_DECIMALS: Record<string, number> = {
  // 0 decimal currencies
  BIF: 0, // Burundian Franc
  CLP: 0, // Chilean Peso
  DJF: 0, // Djiboutian Franc
  GNF: 0, // Guinean Franc
  ISK: 0, // Icelandic Króna
  JPY: 0, // Japanese Yen
  KMF: 0, // Comorian Franc
  KRW: 0, // South Korean Won
  PYG: 0, // Paraguayan Guaraní
  RWF: 0, // Rwandan Franc
  UGX: 0, // Ugandan Shilling
  VND: 0, // Vietnamese Đồng
  VUV: 0, // Vanuatu Vatu
  XAF: 0, // Central African CFA Franc
  XOF: 0, // West African CFA Franc
  XPF: 0, // CFP Franc

  // 3 decimal currencies
  BHD: 3, // Bahraini Dinar
  IQD: 3, // Iraqi Dinar
  JOD: 3, // Jordanian Dinar
  KWD: 3, // Kuwaiti Dinar
  LYD: 3, // Libyan Dinar
  OMR: 3, // Omani Rial
  TND: 3, // Tunisian Dinar
};

/**
 * Get the number of decimal places for a given currency
 * @param currencyCode - ISO 4217 currency code
 * @returns Number of decimal places (default: 2)
 */
function getDecimalPlaces(currencyCode: string): number {
  return CURRENCY_DECIMALS[currencyCode.toUpperCase()] ?? 2;
}

/**
 * Currency conversion utilities for working with minor/major units
 */
export const CurrencyUtils = {
  /**
   * Convert minor units to major units (currency-aware)
   * Examples:
   * - USD: 1234 cents → 12.34 dollars
   * - JPY: 1234 yen → 1234 yen (no decimals)
   * - BHD: 1234 fils → 1.234 dinars (3 decimals)
   *
   * @param minor - Amount in minor units
   * @param currencyCode - ISO 4217 currency code (default: 'USD')
   * @returns Amount in major units
   */
  minorToMajor(minor: number, currencyCode: string = "USD"): number {
    const decimals = getDecimalPlaces(currencyCode);
    const factor = Math.pow(10, decimals);
    return minor / factor;
  },

  /**
   * Convert major units to minor units (currency-aware)
   * Examples:
   * - USD: 12.34 dollars → 1234 cents
   * - JPY: 1234 yen → 1234 yen (no conversion)
   * - BHD: 1.234 dinars → 1234 fils
   *
   * @param major - Amount in major units
   * @param currencyCode - ISO 4217 currency code (default: 'USD')
   * @returns Amount in minor units (rounded to avoid floating point errors)
   */
  majorToMinor(major: number, currencyCode: string = "USD"): number {
    const decimals = getDecimalPlaces(currencyCode);
    const factor = Math.pow(10, decimals);
    return Math.round(major * factor);
  },

  /**
   * Format amount in minor units as currency string
   * @param minor - Amount in minor units
   * @param currencyCode - ISO 4217 currency code (e.g., 'USD', 'EUR', 'JPY')
   * @returns Formatted string (e.g., "$12.34", "¥1234", "د.ب1.234")
   */
  formatMinor(minor: number, currencyCode: string): string {
    const major = this.minorToMajor(minor, currencyCode);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
      }).format(major);
    } catch {
      // Fallback if currency code is invalid
      const decimals = getDecimalPlaces(currencyCode);
      return `${currencyCode} ${major.toFixed(decimals)}`;
    }
  },

  /**
   * Format amount in major units as currency string
   * @param major - Amount in major units
   * @param currencyCode - ISO 4217 currency code
   * @returns Formatted string (e.g., "$12.34", "¥1234", "د.ب1.234")
   */
  formatMajor(major: number, currencyCode: string): string {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
      }).format(major);
    } catch {
      // Fallback if currency code is invalid
      const decimals = getDecimalPlaces(currencyCode);
      return `${currencyCode} ${major.toFixed(decimals)}`;
    }
  },

  /**
   * Get the number of decimal places for a currency
   * @param currencyCode - ISO 4217 currency code
   * @returns Number of decimal places (0, 2, or 3)
   */
  getDecimalPlaces(currencyCode: string): number {
    return getDecimalPlaces(currencyCode);
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

/**
 * Format cents to currency string (backward-compatible with old formatCurrency)
 * @deprecated Use CurrencyUtils.formatMinor instead for currency-aware formatting
 * @param cents - Amount in cents
 * @param currency - ISO 4217 currency code
 * @returns Formatted string (e.g., "$12.34")
 */
export const formatCurrency = (
  cents: number,
  currency: string = "USD",
): string => {
  return CurrencyUtils.formatMinor(cents, currency);
};

/**
 * Parse currency input to cents
 * @param input - String input from user
 * @returns Amount in cents
 */
export const parseCurrency = (input: string): number => {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const amount = parseFloat(cleaned) || 0;
  return Math.round(amount * 100);
};
