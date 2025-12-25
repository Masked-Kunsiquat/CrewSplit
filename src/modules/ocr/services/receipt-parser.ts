/**
 * OCR MODULE - Receipt Parser
 * UI/UX ENGINEER: Parse raw OCR text into structured receipt data
 *
 * Uses heuristics to extract:
 * - Merchant name (first substantial text line)
 * - Total amount (regex patterns for currency)
 * - Date (various date formats)
 * - Currency (symbols and codes)
 */

import type { ParsedReceiptData } from "../types";

/**
 * Common currency symbols and their codes
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₽": "RUB",
  "₩": "KRW",
  A$: "AUD",
  C$: "CAD",
  NZ$: "NZD",
  HK$: "HKD",
  S$: "SGD",
  CHF: "CHF",
  kr: "SEK",
  R$: "BRL",
  "R ": "ZAR",
};

/**
 * Regex patterns for amount detection
 * Matches various formats: $123.45, 123.45, 123,45, etc.
 * Ordered by priority - try "Total" patterns first
 */
const AMOUNT_PATTERNS = [
  // Total with label - very relaxed (up to 200 chars including newlines)
  /(?:take-?out\s+)?(?:total|balance|amount\s+due|grand\s+total)[\s\S]{0,200}?(\d{1,3}(?:[,\s]\d{3})*\.\d{2})/i,
  // Subtotal (fallback if no Total found) - also very relaxed
  /(?:subtotal|sub\s*total|sub-total)[\s\S]{0,200}?(\d{1,3}(?:[,\s]\d{3})*\.\d{2})/i,
  // Currency symbol followed by amount
  /\$\s*(\d{1,3}(?:[,\s]\d{3})*\.\d{2})\b/,
  // Amount with currency code: "123.45 USD"
  /(\d{1,3}(?:[,\s]\d{3})*\.\d{2})\s*([A-Z]{3})\b/,
];

/**
 * Regex patterns for date detection
 * Supports formats: MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.
 */
const DATE_PATTERNS = [
  // ISO format: 2025-12-25
  /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
  // US format: 12/25/2025 or 12-25-2025
  /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/,
  // EU format with named month: 25 Dec 2025
  /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
];

/**
 * Parse raw OCR text into structured receipt data
 *
 * @param rawText - Raw text extracted from receipt image via OCR
 * @returns Parsed receipt data with merchant, amount, currency, and date
 */
export function parseReceiptText(rawText: string): ParsedReceiptData {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    merchant: extractMerchant(lines),
    totalAmountMinor: extractAmount(rawText),
    currency: extractCurrency(rawText),
    date: extractDate(rawText),
    rawText,
    confidence: calculateConfidence(rawText),
  };
}

/**
 * Extract merchant name from receipt text
 * Heuristic: First substantial line (>3 chars, not a number)
 */
function extractMerchant(lines: string[]): string | null {
  for (const line of lines) {
    // Skip short lines, pure numbers, dates, and common non-merchant text
    if (
      line.length <= 3 ||
      /^\d+$/.test(line) ||
      /^[\d\s\-\/:.]+$/.test(line) ||
      /^(receipt|invoice|bill|total|tax|subtotal)/i.test(line)
    ) {
      continue;
    }
    return line;
  }
  return null;
}

/**
 * Extract total amount from receipt text
 * Returns amount in minor units (cents)
 */
function extractAmount(text: string): number | null {
  // DEBUG: Log pattern attempts
  console.log("[OCR Parser] Attempting amount extraction...");

  for (let i = 0; i < AMOUNT_PATTERNS.length; i++) {
    const pattern = AMOUNT_PATTERNS[i];

    // Use matchAll to get ALL matches, then take the last one
    // This helps when "Total" appears multiple times (e.g., in suggested gratuity section)
    const matches = Array.from(text.matchAll(new RegExp(pattern, "gi")));

    console.log(
      `[OCR Parser] Pattern ${i}: ${matches.length > 0 ? `${matches.length} MATCH(ES)` : "no match"}`,
    );

    if (matches.length > 0) {
      // Try matches from last to first (prioritize final total over suggested gratuity)
      for (let j = matches.length - 1; j >= 0; j--) {
        const match = matches[j];
        console.log(`[OCR Parser] Trying match ${j + 1}/${matches.length}`);
        console.log(`[OCR Parser] Full match: "${match[0].substring(0, 100)}..."`);
        console.log(`[OCR Parser] Captured group [1]: "${match[1]}"`);

        // Extract the numeric part (always in match[1] now)
        const amountStr = match[1];
        if (!amountStr || !/\d/.test(amountStr)) {
          console.log(
            `[OCR Parser] Skipping - amountStr invalid: "${amountStr}"`,
          );
          continue;
        }

        // Clean amount: remove spaces and commas
        const cleaned = amountStr.replace(/[\s,]/g, "");
        console.log(`[OCR Parser] Cleaned amount: "${cleaned}"`);

        // Parse to float
        const amountFloat = parseFloat(cleaned);
        if (isNaN(amountFloat) || amountFloat <= 0) {
          console.log(
            `[OCR Parser] Skipping - invalid float: ${amountFloat}`,
          );
          continue;
        }

        // Validate it's not a percentage match (e.g., "18% = 74.93")
        const fullMatch = match[0];
        if (fullMatch.includes("%") || fullMatch.includes("=")) {
          console.log(
            `[OCR Parser] Skipping - looks like percentage/calculation: "${fullMatch.substring(0, 50)}"`,
          );
          continue;
        }

        // Convert to minor units (cents) - round to avoid floating point issues
        const result = Math.round(amountFloat * 100);
        console.log(
          `[OCR Parser] SUCCESS - Extracted amount: ${result} cents`,
        );
        return result;
      }
    }
  }

  console.log("[OCR Parser] No amount pattern matched");
  return null;
}

/**
 * Extract currency from receipt text
 * Checks for currency symbols and ISO codes
 */
function extractCurrency(text: string): string | null {
  // Check for $ symbol first (most common in US)
  if (text.includes("$")) {
    return "USD";
  }

  // Check for other currency symbols
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (symbol !== "$" && text.includes(symbol)) {
      return code;
    }
  }

  // Check for ISO currency codes (3 uppercase letters)
  const codeMatch = text.match(/\b([A-Z]{3})\b/);
  if (codeMatch && isValidCurrencyCode(codeMatch[1])) {
    return codeMatch[1];
  }

  return null;
}

/**
 * Extract date from receipt text
 * Returns ISO 8601 format (YYYY-MM-DD)
 */
function extractDate(text: string): string | null {
  const currentYear = new Date().getFullYear();

  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    let year: number, month: number, day: number;

    if (pattern === DATE_PATTERNS[0]) {
      // ISO format: YYYY-MM-DD
      [, year, month, day] = match.map(Number);
    } else if (pattern === DATE_PATTERNS[1]) {
      // US/EU format: MM/DD/YYYY or DD/MM/YYYY
      const [, p1, p2, p3] = match.map(Number);
      year = p3;
      // Assume US format (MM/DD) if first number > 12, else ambiguous
      if (p1 > 12) {
        day = p1;
        month = p2;
      } else {
        month = p1;
        day = p2;
      }
    } else {
      // Named month format: DD Mon YYYY
      const monthNames = [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ];
      day = parseInt(match[1]);
      month = monthNames.indexOf(match[2].toLowerCase().slice(0, 3)) + 1;
      year = parseInt(match[3]);
    }

    // Validate date
    if (
      year >= 2000 &&
      year <= currentYear + 1 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      // Verify it's a valid date
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        return dateStr;
      }
    }
  }

  return null;
}

/**
 * Calculate confidence score for parsed data (0-1)
 * Based on how many fields were successfully extracted
 */
function calculateConfidence(text: string): number {
  let score = 0;
  const merchant = extractMerchant(text.split("\n"));
  const amount = extractAmount(text);
  const currency = extractCurrency(text);
  const date = extractDate(text);

  if (merchant) score += 0.25;
  if (amount !== null) score += 0.35; // Amount is most important
  if (currency) score += 0.25;
  if (date) score += 0.15;

  return Math.min(score, 1.0);
}

/**
 * Check if a string is a valid ISO 4217 currency code
 * (Basic validation - checks against common codes)
 */
function isValidCurrencyCode(code: string): boolean {
  const commonCodes = [
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "CNY",
    "AUD",
    "CAD",
    "CHF",
    "HKD",
    "NZD",
    "SEK",
    "KRW",
    "SGD",
    "NOK",
    "MXN",
    "INR",
    "RUB",
    "ZAR",
    "TRY",
    "BRL",
    "TWD",
    "DKK",
    "PLN",
    "THB",
    "IDR",
    "HUF",
    "CZK",
    "ILS",
    "CLP",
    "PHP",
    "AED",
    "SAR",
    "MYR",
    "RON",
  ];
  return commonCodes.includes(code);
}
