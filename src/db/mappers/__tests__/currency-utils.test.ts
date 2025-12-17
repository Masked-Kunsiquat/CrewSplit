/**
 * LOCAL DATA ENGINEER: Currency Utils Tests
 * Verify currency-aware conversion functions handle different decimal places
 */

import { CurrencyUtils } from "../currency-utils";

describe("CurrencyUtils", () => {
  describe("minorToMajor", () => {
    it("converts USD (2 decimals) correctly", () => {
      expect(CurrencyUtils.minorToMajor(1234, "USD")).toBe(12.34);
      expect(CurrencyUtils.minorToMajor(100, "USD")).toBe(1.0);
      expect(CurrencyUtils.minorToMajor(1, "USD")).toBe(0.01);
    });

    it("converts JPY (0 decimals) correctly", () => {
      expect(CurrencyUtils.minorToMajor(1234, "JPY")).toBe(1234);
      expect(CurrencyUtils.minorToMajor(100, "JPY")).toBe(100);
      expect(CurrencyUtils.minorToMajor(1, "JPY")).toBe(1);
    });

    it("converts KRW (0 decimals) correctly", () => {
      expect(CurrencyUtils.minorToMajor(50000, "KRW")).toBe(50000);
    });

    it("converts BHD (3 decimals) correctly", () => {
      expect(CurrencyUtils.minorToMajor(1234, "BHD")).toBe(1.234);
      expect(CurrencyUtils.minorToMajor(1000, "BHD")).toBe(1.0);
      expect(CurrencyUtils.minorToMajor(1, "BHD")).toBe(0.001);
    });

    it("defaults to USD when no currency code provided", () => {
      expect(CurrencyUtils.minorToMajor(1234)).toBe(12.34);
    });

    it("handles unknown currencies as 2 decimals", () => {
      expect(CurrencyUtils.minorToMajor(1234, "XYZ")).toBe(12.34);
    });
  });

  describe("majorToMinor", () => {
    it("converts USD (2 decimals) correctly", () => {
      expect(CurrencyUtils.majorToMinor(12.34, "USD")).toBe(1234);
      expect(CurrencyUtils.majorToMinor(1.0, "USD")).toBe(100);
      expect(CurrencyUtils.majorToMinor(0.01, "USD")).toBe(1);
    });

    it("converts JPY (0 decimals) correctly", () => {
      expect(CurrencyUtils.majorToMinor(1234, "JPY")).toBe(1234);
      expect(CurrencyUtils.majorToMinor(100, "JPY")).toBe(100);
      expect(CurrencyUtils.majorToMinor(1, "JPY")).toBe(1);
    });

    it("converts BHD (3 decimals) correctly", () => {
      expect(CurrencyUtils.majorToMinor(1.234, "BHD")).toBe(1234);
      expect(CurrencyUtils.majorToMinor(1.0, "BHD")).toBe(1000);
      expect(CurrencyUtils.majorToMinor(0.001, "BHD")).toBe(1);
    });

    it("rounds to avoid floating point errors", () => {
      expect(CurrencyUtils.majorToMinor(12.345, "USD")).toBe(1235); // rounds 1234.5
      expect(CurrencyUtils.majorToMinor(12.344, "USD")).toBe(1234); // rounds 1234.4
    });

    it("defaults to USD when no currency code provided", () => {
      expect(CurrencyUtils.majorToMinor(12.34)).toBe(1234);
    });
  });

  describe("formatMinor", () => {
    it("formats USD correctly", () => {
      const result = CurrencyUtils.formatMinor(1234, "USD");
      expect(result).toContain("12.34");
    });

    it("formats JPY correctly (no decimals)", () => {
      const result = CurrencyUtils.formatMinor(1234, "JPY");
      expect(result).toContain("1,234");
    });

    it("formats BHD correctly (3 decimals)", () => {
      const result = CurrencyUtils.formatMinor(1234, "BHD");
      expect(result).toContain("1.234");
    });
  });

  describe("formatMajor", () => {
    it("formats USD correctly", () => {
      const result = CurrencyUtils.formatMajor(12.34, "USD");
      expect(result).toContain("12.34");
    });

    it("formats JPY correctly (no decimals)", () => {
      const result = CurrencyUtils.formatMajor(1234, "JPY");
      expect(result).toContain("1,234");
    });

    it("formats BHD correctly (3 decimals)", () => {
      const result = CurrencyUtils.formatMajor(1.234, "BHD");
      expect(result).toContain("1.234");
    });
  });

  describe("getDecimalPlaces", () => {
    it("returns 2 for USD", () => {
      expect(CurrencyUtils.getDecimalPlaces("USD")).toBe(2);
    });

    it("returns 0 for JPY", () => {
      expect(CurrencyUtils.getDecimalPlaces("JPY")).toBe(0);
    });

    it("returns 0 for KRW", () => {
      expect(CurrencyUtils.getDecimalPlaces("KRW")).toBe(0);
    });

    it("returns 3 for BHD", () => {
      expect(CurrencyUtils.getDecimalPlaces("BHD")).toBe(3);
    });

    it("returns 3 for KWD", () => {
      expect(CurrencyUtils.getDecimalPlaces("KWD")).toBe(3);
    });

    it("returns 2 for unknown currencies", () => {
      expect(CurrencyUtils.getDecimalPlaces("XYZ")).toBe(2);
    });

    it("handles lowercase currency codes", () => {
      expect(CurrencyUtils.getDecimalPlaces("jpy")).toBe(0);
      expect(CurrencyUtils.getDecimalPlaces("bhd")).toBe(3);
    });
  });

  describe("convertWithFxRate", () => {
    it("converts and rounds correctly", () => {
      expect(CurrencyUtils.convertWithFxRate(1000, 1.5)).toBe(1500);
      expect(CurrencyUtils.convertWithFxRate(1000, 0.85)).toBe(850);
    });

    it("rounds fractional results", () => {
      expect(CurrencyUtils.convertWithFxRate(100, 1.337)).toBe(134); // 133.7 rounds to 134
      expect(CurrencyUtils.convertWithFxRate(100, 1.333)).toBe(133); // 133.3 rounds to 133
    });
  });

  describe("round-trip conversions", () => {
    it("preserves USD values", () => {
      const original = 1234;
      const major = CurrencyUtils.minorToMajor(original, "USD");
      const roundTrip = CurrencyUtils.majorToMinor(major, "USD");
      expect(roundTrip).toBe(original);
    });

    it("preserves JPY values", () => {
      const original = 50000;
      const major = CurrencyUtils.minorToMajor(original, "JPY");
      const roundTrip = CurrencyUtils.majorToMinor(major, "JPY");
      expect(roundTrip).toBe(original);
    });

    it("preserves BHD values", () => {
      const original = 1234;
      const major = CurrencyUtils.minorToMajor(original, "BHD");
      const roundTrip = CurrencyUtils.majorToMinor(major, "BHD");
      expect(roundTrip).toBe(original);
    });
  });
});
