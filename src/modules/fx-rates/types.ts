/**
 * FX RATES MODULE TYPES
 * Shared type definitions for foreign exchange functionality
 */

import type { FxRateSource } from "@db/schema/fx-rates";

/**
 * Domain type for FX rate (repository layer)
 */
export interface FxRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: FxRateSource;
  fetchedAt: string;
  priority: number;
  metadata: Record<string, unknown> | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Simple rate pair for API responses
 */
export interface RatePair {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
}

/**
 * Staleness information for UI display
 */
export interface StalenessInfo {
  oldestFetchedAt: string | null;
  totalRates: number;
  staleRates: number;
  isStale: boolean; // true if any rates are >24 hours old
}
