/**
 * OCR MODULE - Types
 * UI/UX ENGINEER: Type definitions for OCR receipt scanning
 */

/**
 * Parsed receipt data extracted from OCR text
 */
export interface ParsedReceiptData {
  /** Merchant/vendor name */
  merchant: string | null;
  /** Total amount in original currency (minor units - cents) */
  totalAmountMinor: number | null;
  /** Detected currency code (e.g., "USD", "EUR") */
  currency: string | null;
  /** Transaction date in ISO 8601 format */
  date: string | null;
  /** Raw OCR text for debugging */
  rawText: string;
  /** Confidence score (0-1) for the parsing */
  confidence: number;
}

/**
 * Result from OCR scanning operation
 */
export interface ScanResult {
  success: boolean;
  data?: ParsedReceiptData;
  error?: string;
}
