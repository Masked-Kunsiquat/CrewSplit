/**
 * Tests for currency utility functions
 * Focus: convertWithFxRate edge cases and deterministic behavior
 */

import { CurrencyUtils } from "../currency";

describe("CurrencyUtils.convertWithFxRate", () => {
  describe("basic conversions", () => {
    test("converts USD to EUR at typical rate", () => {
      // $10.00 USD at rate 0.92
      expect(CurrencyUtils.convertWithFxRate(1000, 0.92)).toBe(920);
    });

    test("converts EUR to USD at typical rate", () => {
      // €11.00 EUR at rate 1.08695652
      expect(CurrencyUtils.convertWithFxRate(1100, 1.08695652)).toBe(1196);
    });

    test("converts with rate > 1", () => {
      // $12.34 USD to JPY at rate 110
      expect(CurrencyUtils.convertWithFxRate(1234, 110)).toBe(135740);
    });

    test("converts with rate < 1", () => {
      // ¥15000 JPY to USD at rate 0.0067
      expect(CurrencyUtils.convertWithFxRate(15000, 0.0067)).toBe(101);
    });
  });

  describe("rounding behavior", () => {
    test("rounds 0.5 up (banker's rounding)", () => {
      // Test Math.round behavior: 0.5 rounds to nearest even
      expect(CurrencyUtils.convertWithFxRate(1000, 0.9995)).toBe(1000); // 999.5 -> 1000
    });

    test("rounds down when < 0.5", () => {
      expect(CurrencyUtils.convertWithFxRate(1000, 0.9994)).toBe(999); // 999.4 -> 999
    });

    test("rounds up when > 0.5", () => {
      expect(CurrencyUtils.convertWithFxRate(1000, 0.9996)).toBe(1000); // 999.6 -> 1000
    });

    test("handles fractional cents deterministically", () => {
      // Same inputs always produce same output
      const amount = 1234;
      const rate = 0.92156789;
      const result1 = CurrencyUtils.convertWithFxRate(amount, rate);
      const result2 = CurrencyUtils.convertWithFxRate(amount, rate);
      expect(result1).toBe(result2);
      expect(result1).toBe(1137); // Math.round(1234 * 0.92156789) = 1137
    });
  });

  describe("edge cases: zero and identity", () => {
    test("converts zero amount", () => {
      expect(CurrencyUtils.convertWithFxRate(0, 1.5)).toBe(0);
    });

    test("converts with rate of 1.0 (same currency)", () => {
      expect(CurrencyUtils.convertWithFxRate(1234, 1.0)).toBe(1234);
    });

    test("converts with rate of 0 (edge case)", () => {
      // Rate of 0 would mean target currency is worthless
      expect(CurrencyUtils.convertWithFxRate(1000, 0)).toBe(0);
    });
  });

  describe("edge cases: negative amounts", () => {
    test("converts negative amount (refunds)", () => {
      expect(CurrencyUtils.convertWithFxRate(-500, 1.1)).toBe(-550);
    });

    test("converts negative amount with rounding", () => {
      expect(CurrencyUtils.convertWithFxRate(-1000, 0.92)).toBe(-920);
    });

    test("rounds negative amounts correctly", () => {
      // -999.6 should round to -1000 (away from zero)
      expect(CurrencyUtils.convertWithFxRate(-1000, 0.9996)).toBe(-1000);
    });
  });

  describe("edge cases: large numbers", () => {
    test("converts large amounts without overflow", () => {
      // $1,000,000.00 at rate 1.1
      expect(CurrencyUtils.convertWithFxRate(100000000, 1.1)).toBe(110000000);
    });

    test("converts very small amounts", () => {
      // 1 cent at rate 0.92
      expect(CurrencyUtils.convertWithFxRate(1, 0.92)).toBe(1); // 0.92 rounds to 1
    });

    test("converts with high precision rate", () => {
      // Test precision handling with many decimal places
      expect(CurrencyUtils.convertWithFxRate(1000, 1.123456789)).toBe(1123);
    });
  });

  describe("determinism verification", () => {
    test("produces same result for same inputs (multiple calls)", () => {
      const amount = 5432;
      const rate = 0.87654321;
      const results = Array.from({ length: 100 }, () =>
        CurrencyUtils.convertWithFxRate(amount, rate),
      );

      // All results should be identical
      const firstResult = results[0];
      expect(results.every((r) => r === firstResult)).toBe(true);
      expect(firstResult).toBe(4761); // Math.round(5432 * 0.87654321) = 4761
    });

    test("handles floating-point precision consistently", () => {
      // Test that floating-point arithmetic doesn't cause drift
      const amount = 333;
      const rate = 3.0;
      expect(CurrencyUtils.convertWithFxRate(amount, rate)).toBe(999);

      // Reverse conversion should be close (accounting for rounding)
      const reverseRate = 1 / 3.0;
      expect(CurrencyUtils.convertWithFxRate(999, reverseRate)).toBe(333);
    });
  });

  describe("real-world conversion scenarios", () => {
    test("USD to EUR common rate", () => {
      expect(CurrencyUtils.convertWithFxRate(1000, 0.92)).toBe(920);
    });

    test("EUR to USD common rate", () => {
      expect(CurrencyUtils.convertWithFxRate(1000, 1.08)).toBe(1080);
    });

    test("USD to GBP common rate", () => {
      expect(CurrencyUtils.convertWithFxRate(1000, 0.79)).toBe(790);
    });

    test("USD to JPY common rate", () => {
      expect(CurrencyUtils.convertWithFxRate(1000, 149.5)).toBe(149500);
    });

    test("JPY to USD common rate", () => {
      expect(CurrencyUtils.convertWithFxRate(15000, 0.0067)).toBe(101);
    });

    test("CAD to USD common rate", () => {
      expect(CurrencyUtils.convertWithFxRate(1000, 0.73)).toBe(730);
    });
  });

  describe("consistency with compute-conversion.ts", () => {
    test("matches expense conversion logic", () => {
      // From compute-conversion.test.ts
      const originalAmountMinor = 15075;
      const fxRate = 0.92;
      expect(CurrencyUtils.convertWithFxRate(originalAmountMinor, fxRate)).toBe(
        13869,
      );
    });

    test("matches JPY to EUR conversion", () => {
      // From compute-conversion.test.ts
      const originalAmountMinor = 1500000; // ¥15,000.00
      const fxRate = 0.0067;
      expect(CurrencyUtils.convertWithFxRate(originalAmountMinor, fxRate)).toBe(
        10050,
      );
    });

    test("matches GBP to EUR conversion", () => {
      // From compute-conversion.test.ts
      const originalAmountMinor = 8500; // £85.00
      const fxRate = 1.17;
      expect(CurrencyUtils.convertWithFxRate(originalAmountMinor, fxRate)).toBe(
        9945,
      );
    });
  });
});
