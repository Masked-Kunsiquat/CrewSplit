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
 * Rules:
 * 1. If currencies match: no conversion needed, fxRateToTrip = null
 * 2. If currencies differ: fxRateToTrip is required and must be positive
 * 3. Converted amount is either providedConverted or Math.round(originalAmountMinor * providedRate)
 * 4. All amounts are in minor units (cents)
 *
 * @throws {Error} If currencies differ and fxRateToTrip is missing or invalid
 */
export function computeConversion(input: ConversionInput): ConversionResult {
  const {
    originalAmountMinor,
    originalCurrency,
    tripCurrencyCode,
    providedRate,
    providedConverted,
  } = input;

  // Case 1: Same currency - no conversion needed
  if (originalCurrency === tripCurrencyCode) {
    return {
      convertedAmountMinor: originalAmountMinor,
      fxRateToTrip: null,
    };
  }

  // Case 2: Different currencies - rate is required
  if (providedRate === undefined || providedRate === null) {
    throw new Error(
      "fxRateToTrip is required when expense currency differs from trip currency",
    );
  }

  if (providedRate <= 0) {
    throw new Error("fxRateToTrip must be positive");
  }

  // Compute converted amount (use provided if available, otherwise calculate)
  const convertedAmountMinor =
    providedConverted ?? Math.round(originalAmountMinor * providedRate);

  return {
    convertedAmountMinor,
    fxRateToTrip: providedRate,
  };
}
