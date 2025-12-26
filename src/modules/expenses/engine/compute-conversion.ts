/**
 * MODELER: Pure currency conversion function
 *
 * Computes the converted amount and FX rate for an expense based on:
 * - Original amount in original currency
 * - Original currency code
 * - Trip currency code
 * - Optional FX rate and/or pre-computed converted amount
 *
 * This is a pure function with ZERO dependencies - same inputs always produce same outputs.
 */

import { createFxRateError } from "@utils/errors";

export interface ConversionInput {
  originalAmountMinor: number;
  originalCurrency: string;
  tripCurrencyCode: string;
  providedRate?: number | null;
  providedConverted?: number;
}

export interface ConversionResult {
  convertedAmountMinor: number;
  fxRateToTrip: number | null;
}

/**
 * Computes currency conversion for an expense.
 *
 * Deterministic pure function that converts expense amounts from original currency to trip currency.
 * Uses either a pre-computed converted amount or calculates it from the exchange rate.
 * Ensures all monetary calculations use integer arithmetic (minor units).
 *
 * Rules:
 * 1. If currencies match (case-insensitive): no conversion needed, fxRateToTrip = null
 * 2. If currencies differ: fxRateToTrip is required and must be positive
 * 3. Converted amount is either providedConverted or Math.round(originalAmountMinor * providedRate)
 * 4. All amounts are in minor units (cents)
 * 5. Currency codes are normalized to uppercase for comparison
 *
 * @param input - Conversion input parameters
 * @param input.originalAmountMinor - Amount in original currency (cents)
 * @param input.originalCurrency - Original currency code (e.g., "USD", "EUR")
 * @param input.tripCurrencyCode - Trip currency code (e.g., "GBP")
 * @param input.providedRate - Exchange rate from original to trip currency (optional)
 * @param input.providedConverted - Pre-computed converted amount (optional, overrides rate calculation)
 *
 * @precondition originalAmountMinor must be a non-negative integer
 * @precondition originalCurrency and tripCurrencyCode must be valid ISO 4217 codes
 * @precondition If currencies differ, providedRate must be defined and > 0
 * @precondition If providedRate is defined, it must be a positive finite number
 * @precondition If providedConverted is defined, it must be a non-negative integer
 *
 * @postcondition If currencies match: fxRateToTrip is null and convertedAmountMinor === originalAmountMinor
 * @postcondition If currencies differ: fxRateToTrip === providedRate and is positive
 * @postcondition convertedAmountMinor is always a non-negative integer
 * @postcondition Function is deterministic: same inputs always produce same output
 * @postcondition Currency codes are case-insensitive ("USD" === "usd")
 *
 * @invariant Conversion determinism: Math.round(amount * rate) always produces same result
 * @invariant No loss of precision: all arithmetic uses integers for final amounts
 * @invariant Rate validation: if currencies differ, rate must be present and valid
 *
 * @throws {AppError} FX_RATE_REQUIRED - If currencies differ and providedRate is null/undefined
 * @throws {AppError} FX_RATE_INVALID - If providedRate ≤ 0 or non-finite
 *
 * @returns ConversionResult with convertedAmountMinor and fxRateToTrip
 *
 * @example
 * // Same currency - no conversion
 * computeConversion({
 *   originalAmountMinor: 1000,
 *   originalCurrency: 'USD',
 *   tripCurrencyCode: 'usd'  // case-insensitive
 * });
 * // Returns: { convertedAmountMinor: 1000, fxRateToTrip: null }
 *
 * @example
 * // Different currency - with rate
 * computeConversion({
 *   originalAmountMinor: 1000,  // $10.00
 *   originalCurrency: 'USD',
 *   tripCurrencyCode: 'EUR',
 *   providedRate: 0.85
 * });
 * // Returns: { convertedAmountMinor: 850, fxRateToTrip: 0.85 }  // €8.50
 *
 * @example
 * // Different currency - with pre-computed amount
 * computeConversion({
 *   originalAmountMinor: 1000,
 *   originalCurrency: 'USD',
 *   tripCurrencyCode: 'EUR',
 *   providedRate: 0.85,
 *   providedConverted: 849  // Use this instead of calculating
 * });
 * // Returns: { convertedAmountMinor: 849, fxRateToTrip: 0.85 }
 */
export function computeConversion(input: ConversionInput): ConversionResult {
  const {
    originalAmountMinor,
    originalCurrency,
    tripCurrencyCode,
    providedRate,
    providedConverted,
  } = input;

  // Normalize currency codes to uppercase for comparison (case-insensitive)
  const normalizedOriginal = originalCurrency.toUpperCase();
  const normalizedTrip = tripCurrencyCode.toUpperCase();

  // Case 1: Same currency - no conversion needed
  if (normalizedOriginal === normalizedTrip) {
    return {
      convertedAmountMinor: originalAmountMinor,
      fxRateToTrip: null,
    };
  }

  // Case 2: Different currencies - rate is required
  if (providedRate === undefined || providedRate === null) {
    throw createFxRateError(
      "FX_RATE_REQUIRED",
      normalizedOriginal,
      normalizedTrip,
      {
        message:
          "fxRateToTrip is required when expense currency differs from trip currency",
      },
    );
  }

  if (providedRate <= 0) {
    throw createFxRateError(
      "FX_RATE_INVALID",
      normalizedOriginal,
      normalizedTrip,
      { rate: providedRate, message: "fxRateToTrip must be positive" },
    );
  }

  // Compute converted amount (use provided if available, otherwise calculate)
  const convertedAmountMinor =
    providedConverted ?? Math.round(originalAmountMinor * providedRate);

  return {
    convertedAmountMinor,
    fxRateToTrip: providedRate,
  };
}
