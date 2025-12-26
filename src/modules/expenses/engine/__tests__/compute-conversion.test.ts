/**
 * EXPENSE MODULE - computeConversion Tests
 * MODELER: Test all currency conversion scenarios
 */

import { computeConversion, ConversionInput } from "../compute-conversion";

describe("computeConversion", () => {
  describe("same currency (no conversion)", () => {
    it("should return original amount with null fxRate when currencies match", () => {
      const input: ConversionInput = {
        originalAmountMinor: 5000,
        originalCurrency: "USD",
        tripCurrencyCode: "USD",
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 5000,
        fxRateToTrip: null,
      });
    });

    it("should ignore providedRate when currencies match", () => {
      const input: ConversionInput = {
        originalAmountMinor: 3000,
        originalCurrency: "EUR",
        tripCurrencyCode: "EUR",
        providedRate: 1.2, // Should be ignored
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 3000,
        fxRateToTrip: null,
      });
    });

    it("should ignore providedConverted when currencies match", () => {
      const input: ConversionInput = {
        originalAmountMinor: 2000,
        originalCurrency: "GBP",
        tripCurrencyCode: "GBP",
        providedConverted: 9999, // Should be ignored
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 2000,
        fxRateToTrip: null,
      });
    });

    it("should handle zero amount with same currency", () => {
      const input: ConversionInput = {
        originalAmountMinor: 0,
        originalCurrency: "USD",
        tripCurrencyCode: "USD",
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 0,
        fxRateToTrip: null,
      });
    });
  });

  describe("different currencies (conversion required)", () => {
    it("should calculate converted amount using providedRate", () => {
      const input: ConversionInput = {
        originalAmountMinor: 10000, // $100.00
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: 0.85, // 1 USD = 0.85 EUR
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 8500, // 10000 * 0.85 = 8500
        fxRateToTrip: 0.85,
      });
    });

    it("should round to nearest integer (Math.round)", () => {
      const input: ConversionInput = {
        originalAmountMinor: 10000,
        originalCurrency: "USD",
        tripCurrencyCode: "JPY",
        providedRate: 110.456, // Results in fractional cents
      };

      const result = computeConversion(input);

      // 10000 * 110.456 = 1104560
      expect(result.convertedAmountMinor).toBe(1104560);
      expect(result.fxRateToTrip).toBe(110.456);
    });

    it("should round 0.5 up (banker's rounding)", () => {
      const input: ConversionInput = {
        originalAmountMinor: 1000,
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: 0.8005, // 1000 * 0.8005 = 800.5
      };

      const result = computeConversion(input);

      expect(result.convertedAmountMinor).toBe(801); // Math.round(800.5) = 801
    });

    it("should use providedConverted when available (no calculation)", () => {
      const input: ConversionInput = {
        originalAmountMinor: 10000,
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: 0.85,
        providedConverted: 8600, // Override calculation
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 8600, // Use provided, not calculated
        fxRateToTrip: 0.85,
      });
    });

    it("should handle rate > 1 (strengthening currency)", () => {
      const input: ConversionInput = {
        originalAmountMinor: 5000,
        originalCurrency: "EUR",
        tripCurrencyCode: "USD",
        providedRate: 1.2, // 1 EUR = 1.2 USD
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 6000, // 5000 * 1.2 = 6000
        fxRateToTrip: 1.2,
      });
    });

    it("should handle very small rates", () => {
      const input: ConversionInput = {
        originalAmountMinor: 100000,
        originalCurrency: "JPY",
        tripCurrencyCode: "USD",
        providedRate: 0.0091, // 1 JPY ≈ 0.0091 USD
      };

      const result = computeConversion(input);

      expect(result.convertedAmountMinor).toBe(910); // 100000 * 0.0091 = 910
      expect(result.fxRateToTrip).toBe(0.0091);
    });

    it("should handle very large rates", () => {
      const input: ConversionInput = {
        originalAmountMinor: 1000,
        originalCurrency: "USD",
        tripCurrencyCode: "JPY",
        providedRate: 150.5,
      };

      const result = computeConversion(input);

      expect(result.convertedAmountMinor).toBe(150500); // 1000 * 150.5 = 150500
    });

    it("should handle zero amount with conversion", () => {
      const input: ConversionInput = {
        originalAmountMinor: 0,
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: 0.85,
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 0,
        fxRateToTrip: 0.85,
      });
    });
  });

  describe("error cases", () => {
    it("should throw when currencies differ and providedRate is undefined", () => {
      const input: ConversionInput = {
        originalAmountMinor: 5000,
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        // providedRate missing
      };

      expect(() => computeConversion(input)).toThrow(
        "fxRateToTrip is required when expense currency differs from trip currency",
      );
    });

    it("should throw when currencies differ and providedRate is null", () => {
      const input: ConversionInput = {
        originalAmountMinor: 5000,
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: null,
      };

      expect(() => computeConversion(input)).toThrow(
        "fxRateToTrip is required when expense currency differs from trip currency",
      );
    });

    it("should throw when providedRate is zero", () => {
      const input: ConversionInput = {
        originalAmountMinor: 5000,
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: 0,
      };

      expect(() => computeConversion(input)).toThrow(
        "fxRateToTrip must be positive",
      );
    });

    it("should throw when providedRate is negative", () => {
      const input: ConversionInput = {
        originalAmountMinor: 5000,
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: -0.85,
      };

      expect(() => computeConversion(input)).toThrow(
        "fxRateToTrip must be positive",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle 1:1 exchange rate", () => {
      const input: ConversionInput = {
        originalAmountMinor: 5000,
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: 1.0,
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 5000,
        fxRateToTrip: 1.0,
      });
    });

    it("should handle very large amounts", () => {
      const input: ConversionInput = {
        originalAmountMinor: 999999999, // $9,999,999.99
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: 0.85,
      };

      const result = computeConversion(input);

      expect(result.convertedAmountMinor).toBe(849999999); // 999999999 * 0.85
    });

    it("should be deterministic (same inputs -> same outputs)", () => {
      const input: ConversionInput = {
        originalAmountMinor: 12345,
        originalCurrency: "USD",
        tripCurrencyCode: "GBP",
        providedRate: 0.789,
      };

      const result1 = computeConversion(input);
      const result2 = computeConversion(input);
      const result3 = computeConversion(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it("should handle providedConverted = 0", () => {
      const input: ConversionInput = {
        originalAmountMinor: 5000,
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: 0.85,
        providedConverted: 0,
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 0, // Use provided zero
        fxRateToTrip: 0.85,
      });
    });

    it("should handle currency codes case-insensitively", () => {
      const input: ConversionInput = {
        originalAmountMinor: 5000,
        originalCurrency: "usd",
        tripCurrencyCode: "USD",
      };

      // Different case = same currency (normalized to uppercase)
      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 5000,
        fxRateToTrip: null, // Same currency, no conversion
      });
    });

    it("should normalize mixed case currency codes", () => {
      const input: ConversionInput = {
        originalAmountMinor: 3000,
        originalCurrency: "EuR",
        tripCurrencyCode: "eur",
      };

      const result = computeConversion(input);

      expect(result).toEqual({
        convertedAmountMinor: 3000,
        fxRateToTrip: null, // Same currency after normalization
      });
    });
  });

  describe("real-world scenarios", () => {
    it("should handle USD to EUR conversion (typical vacation expense)", () => {
      const input: ConversionInput = {
        originalAmountMinor: 15075, // $150.75
        originalCurrency: "USD",
        tripCurrencyCode: "EUR",
        providedRate: 0.92,
      };

      const result = computeConversion(input);

      expect(result.convertedAmountMinor).toBe(13869); // Math.round(15075 * 0.92)
      expect(result.fxRateToTrip).toBe(0.92);
    });

    it("should handle JPY to USD (high denomination currency)", () => {
      const input: ConversionInput = {
        originalAmountMinor: 1500000, // ¥15,000 (in minor units, but JPY doesn't use decimals)
        originalCurrency: "JPY",
        tripCurrencyCode: "USD",
        providedRate: 0.0067,
      };

      const result = computeConversion(input);

      expect(result.convertedAmountMinor).toBe(10050); // Math.round(1500000 * 0.0067)
    });

    it("should handle GBP to EUR (post-Brexit rates)", () => {
      const input: ConversionInput = {
        originalAmountMinor: 8500, // £85.00
        originalCurrency: "GBP",
        tripCurrencyCode: "EUR",
        providedRate: 1.17,
      };

      const result = computeConversion(input);

      expect(result.convertedAmountMinor).toBe(9945); // Math.round(8500 * 1.17)
    });
  });
});
