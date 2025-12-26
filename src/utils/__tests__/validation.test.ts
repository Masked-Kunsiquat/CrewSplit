/**
 * Tests for validation utilities
 */

import {
  PERCENTAGE_TOLERANCE,
  isValidPercentageSum,
  parseFiniteNumber,
  isValidWeight,
} from "../validation";

describe("validation utilities", () => {
  describe("PERCENTAGE_TOLERANCE", () => {
    it("should be slightly greater than 0.01", () => {
      expect(PERCENTAGE_TOLERANCE).toBeGreaterThan(0.01);
      expect(PERCENTAGE_TOLERANCE).toBeLessThan(0.02);
    });
  });

  describe("isValidPercentageSum", () => {
    it("should accept exactly 100", () => {
      expect(isValidPercentageSum(100)).toBe(true);
    });

    it("should accept values within tolerance of 100", () => {
      expect(isValidPercentageSum(99.99)).toBe(true);
      expect(isValidPercentageSum(100.01)).toBe(true);
      expect(isValidPercentageSum(99.995)).toBe(true);
      expect(isValidPercentageSum(100.005)).toBe(true);
    });

    it("should reject values outside tolerance", () => {
      expect(isValidPercentageSum(98.5)).toBe(false);
      expect(isValidPercentageSum(101.5)).toBe(false);
      expect(isValidPercentageSum(99.98)).toBe(false);
      expect(isValidPercentageSum(100.02)).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isValidPercentageSum(0)).toBe(false);
      expect(isValidPercentageSum(200)).toBe(false);
      expect(isValidPercentageSum(-100)).toBe(false);
    });

    it("should handle floating-point precision", () => {
      // Simulate accumulated floating-point errors
      const sum = 33.33 + 33.33 + 33.34; // 100.00000000000001
      expect(isValidPercentageSum(sum)).toBe(true);
    });
  });

  describe("parseFiniteNumber", () => {
    it("should parse valid number strings", () => {
      expect(parseFiniteNumber("42")).toBe(42);
      expect(parseFiniteNumber("42.5")).toBe(42.5);
      expect(parseFiniteNumber("-10")).toBe(-10);
      expect(parseFiniteNumber("0")).toBe(0);
      expect(parseFiniteNumber("0.001")).toBe(0.001);
    });

    it("should pass through valid numbers", () => {
      expect(parseFiniteNumber(42)).toBe(42);
      expect(parseFiniteNumber(42.5)).toBe(42.5);
      expect(parseFiniteNumber(-10)).toBe(-10);
      expect(parseFiniteNumber(0)).toBe(0);
    });

    it("should return null for invalid strings", () => {
      expect(parseFiniteNumber("abc")).toBe(null);
      expect(parseFiniteNumber("")).toBe(null);
      expect(parseFiniteNumber("not a number")).toBe(null);
    });

    it("should return null for non-finite numbers", () => {
      expect(parseFiniteNumber(NaN)).toBe(null);
      expect(parseFiniteNumber(Infinity)).toBe(null);
      expect(parseFiniteNumber(-Infinity)).toBe(null);
    });

    it("should handle whitespace in strings", () => {
      expect(parseFiniteNumber("  42  ")).toBe(42);
      expect(parseFiniteNumber(" 42.5 ")).toBe(42.5);
    });

    it("should handle scientific notation", () => {
      expect(parseFiniteNumber("1e3")).toBe(1000);
      expect(parseFiniteNumber("1.5e2")).toBe(150);
    });
  });

  describe("isValidWeight", () => {
    it("should accept positive finite numbers", () => {
      expect(isValidWeight(1)).toBe(true);
      expect(isValidWeight(2.5)).toBe(true);
      expect(isValidWeight(0.1)).toBe(true);
      expect(isValidWeight(100)).toBe(true);
      expect(isValidWeight(0.001)).toBe(true);
    });

    it("should reject zero", () => {
      expect(isValidWeight(0)).toBe(false);
    });

    it("should reject negative numbers", () => {
      expect(isValidWeight(-1)).toBe(false);
      expect(isValidWeight(-0.5)).toBe(false);
      expect(isValidWeight(-100)).toBe(false);
    });

    it("should reject non-finite numbers", () => {
      expect(isValidWeight(NaN)).toBe(false);
      expect(isValidWeight(Infinity)).toBe(false);
      expect(isValidWeight(-Infinity)).toBe(false);
    });
  });
});
