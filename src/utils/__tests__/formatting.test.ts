/**
 * Tests for formatting utilities
 */

import {
  formatFxRate,
  formatPercentage,
  formatAmount,
  formatAmountInput,
  formatMajorAmount,
} from "../formatting";

describe("formatting utilities", () => {
  describe("formatFxRate", () => {
    it("should format rates with 4 decimal places", () => {
      expect(formatFxRate(1.1234)).toBe("1.1234");
      expect(formatFxRate(0.85)).toBe("0.8500");
      expect(formatFxRate(1.0)).toBe("1.0000");
    });

    it("should handle very small rates", () => {
      expect(formatFxRate(0.0001)).toBe("0.0001");
      expect(formatFxRate(0.005)).toBe("0.0050");
    });

    it("should handle large rates", () => {
      expect(formatFxRate(123.4567)).toBe("123.4567");
      expect(formatFxRate(1000.5)).toBe("1000.5000");
    });

    it("should round to 4 decimals", () => {
      expect(formatFxRate(1.12345)).toBe("1.1235");
      expect(formatFxRate(1.12344)).toBe("1.1234");
    });
  });

  describe("formatPercentage", () => {
    it("should format percentages with 1 decimal place", () => {
      expect(formatPercentage(33.3)).toBe("33.3%");
      expect(formatPercentage(50.0)).toBe("50.0%");
      expect(formatPercentage(66.7)).toBe("66.7%");
    });

    it("should include % symbol by default", () => {
      expect(formatPercentage(25.5)).toBe("25.5%");
      expect(formatPercentage(100)).toBe("100.0%");
    });

    it("should optionally exclude % symbol", () => {
      expect(formatPercentage(25.5, false)).toBe("25.5");
      expect(formatPercentage(100, false)).toBe("100.0");
    });

    it("should round to 1 decimal", () => {
      expect(formatPercentage(33.33)).toBe("33.3%");
      expect(formatPercentage(66.67)).toBe("66.7%");
      expect(formatPercentage(33.35)).toBe("33.4%");
    });

    it("should handle edge cases", () => {
      expect(formatPercentage(0)).toBe("0.0%");
      expect(formatPercentage(100)).toBe("100.0%");
    });
  });

  describe("formatAmount", () => {
    it("should format minor units to major with currency", () => {
      expect(formatAmount(1234, "USD")).toBe("USD 12.34");
      expect(formatAmount(500, "EUR")).toBe("EUR 5.00");
      expect(formatAmount(0, "GBP")).toBe("GBP 0.00");
    });

    it("should handle large amounts", () => {
      expect(formatAmount(123456, "USD")).toBe("USD 1234.56");
      expect(formatAmount(1000000, "EUR")).toBe("EUR 10000.00");
    });

    it("should round to 2 decimals", () => {
      expect(formatAmount(1235, "USD")).toBe("USD 12.35");
      expect(formatAmount(999, "EUR")).toBe("EUR 9.99");
    });
  });

  describe("formatAmountInput", () => {
    it("should format minor units to major without currency", () => {
      expect(formatAmountInput(1234)).toBe("12.34");
      expect(formatAmountInput(500)).toBe("5.00");
      expect(formatAmountInput(0)).toBe("0.00");
    });

    it("should handle large amounts", () => {
      expect(formatAmountInput(123456)).toBe("1234.56");
      expect(formatAmountInput(1000000)).toBe("10000.00");
    });

    it("should always show 2 decimal places", () => {
      expect(formatAmountInput(100)).toBe("1.00");
      expect(formatAmountInput(1)).toBe("0.01");
      expect(formatAmountInput(1050)).toBe("10.50");
    });
  });

  describe("formatMajorAmount", () => {
    it("should format major units with 2 decimal places", () => {
      expect(formatMajorAmount(12.34)).toBe("12.34");
      expect(formatMajorAmount(5)).toBe("5.00");
      expect(formatMajorAmount(0)).toBe("0.00");
    });

    it("should handle large amounts", () => {
      expect(formatMajorAmount(1234.56)).toBe("1234.56");
      expect(formatMajorAmount(10000)).toBe("10000.00");
    });

    it("should round to 2 decimals", () => {
      expect(formatMajorAmount(12.345)).toBe("12.35");
      expect(formatMajorAmount(12.344)).toBe("12.34");
    });
  });
});
