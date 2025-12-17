/**
 * LOCAL DATA ENGINEER: FX Rates Schema
 * Cached foreign exchange rates for offline currency conversions
 *
 * DESIGN PRINCIPLES:
 * 1. Determinism: Rates are versioned and immutable once stored
 * 2. Offline-first: All conversions use locally cached rates
 * 3. Auditability: Track source, timestamp, and which trips used which rates
 * 4. Multi-source: Support Frankfurter, ExchangeRate-API, manual entry
 *
 * USAGE PATTERNS:
 * - CachedFxRateProvider queries this table for conversions
 * - Background sync updates rates when online
 * - Manual entry creates user-sourced rates with higher priority
 * - Trips can optionally snapshot rates for audit trail (via fx_rate_snapshots)
 */

import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { trips } from "./trips";

/**
 * FX_RATES TABLE
 * Stores exchange rate data from multiple sources
 *
 * CURRENCY PAIR REPRESENTATION:
 * - baseCurrency: The "from" currency (e.g., "USD")
 * - quoteCurrency: The "to" currency (e.g., "EUR")
 * - rate: How many units of quoteCurrency per 1 unit of baseCurrency
 * - Example: USD→EUR rate of 0.85 means 1 USD = 0.85 EUR
 *
 * RATE PRECISION:
 * - Stored as REAL (SQLite floating-point)
 * - Precision: ~6-8 decimal places (adequate for daily settlement rates)
 * - Conversion uses integer math: round(amountMinor * rate) for cents
 *
 * SOURCE TYPES:
 * - 'frankfurter': api.frankfurter.dev (primary, no key required)
 * - 'exchangerate-api': open.er-api.com (fallback, no key required)
 * - 'manual': User-entered rate
 * - 'sync': Rate received from another device via sync
 *
 * STALENESS:
 * - fetchedAt: When rate was obtained (ISO 8601 timestamp)
 * - Rates older than 7 days may trigger refresh warning in UI
 * - Manual rates never expire
 */
export const fxRates = sqliteTable(
  "fx_rates",
  {
    // Composite primary key: (baseCurrency, quoteCurrency, fetchedAt)
    // This allows multiple versions of the same pair for audit trail
    id: text("id").primaryKey(), // UUID for easy reference

    // Currency pair (ISO 4217 codes)
    baseCurrency: text("base_currency").notNull(), // e.g., "USD"
    quoteCurrency: text("quote_currency").notNull(), // e.g., "EUR"

    /**
     * Exchange rate: baseCurrency → quoteCurrency
     * Example: USD→EUR rate of 0.92 means 1 USD = 0.92 EUR
     *
     * IMPORTANT: For inverse conversion (EUR→USD), either:
     * 1. Query for the inverse pair (EUR, USD) if it exists
     * 2. Calculate 1/rate (e.g., 1/0.92 = 1.087)
     *
     * Provider should store both directions to avoid division
     */
    rate: real("rate").notNull(),

    /**
     * Data source identifier
     * - 'frankfurter': Primary source (api.frankfurter.dev)
     * - 'exchangerate-api': Fallback source (open.er-api.com)
     * - 'manual': User-entered rate
     * - 'sync': Rate synced from another device
     */
    source: text("source").notNull(), // 'frankfurter' | 'exchangerate-api' | 'manual' | 'sync'

    /**
     * When this rate was fetched/entered (ISO 8601)
     * - For API sources: Response timestamp or fetch time
     * - For manual: Entry time
     * - For sync: Original fetchedAt (preserved across devices)
     */
    fetchedAt: text("fetched_at").notNull(),

    /**
     * Priority for rate selection (higher = preferred)
     * - manual: 100 (user override takes precedence)
     * - frankfurter: 50 (primary API)
     * - exchangerate-api: 40 (fallback API)
     * - sync: 30 (secondary device data)
     *
     * When multiple rates exist for same pair, use highest priority + most recent
     */
    priority: integer("priority").notNull().default(50),

    /**
     * Optional metadata (JSON string)
     * - API response details (e.g., {"time_last_updated": "2025-01-15"})
     * - Manual entry notes (e.g., {"note": "ECB reference rate"})
     * - Sync origin (e.g., {"deviceId": "abc123"})
     */
    metadata: text("metadata"), // JSON string

    /**
     * Soft delete flag
     * - Allows archiving outdated rates without breaking audit trail
     * - Provider ignores archived rates unless explicitly requested
     */
    isArchived: integer("is_archived", { mode: "boolean" })
      .notNull()
      .default(false),

    // Timestamps
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    // Index for fast lookups: (baseCurrency, quoteCurrency) → most recent rate
    currencyPairIdx: index("fx_rates_currency_pair_idx").on(
      table.baseCurrency,
      table.quoteCurrency,
      table.isArchived,
    ),
    // Index for staleness checks: fetchedAt DESC
    fetchedAtIdx: index("fx_rates_fetched_at_idx").on(table.fetchedAt),
    // Index for source-based queries
    sourceIdx: index("fx_rates_source_idx").on(table.source),
  }),
);

/**
 * FX_RATE_SNAPSHOTS TABLE (Optional - for audit trail)
 * Links trips to specific FX rates used for conversions
 *
 * PURPOSE:
 * - Preserve exact rates used when trip was closed/exported
 * - Enable reproducible settlement calculations months/years later
 * - Audit trail: "This trip used USD→EUR rate of 0.92 from 2025-01-15"
 *
 * USAGE:
 * - When trip is closed/finalized: snapshot all used FX rates
 * - When exporting trip: include snapshots for full reproducibility
 * - When importing trip: restore both expenses AND rate snapshots
 *
 * NOTE: This is OPTIONAL - implement after core fx_rates table works
 */
export const fxRateSnapshots = sqliteTable(
  "fx_rate_snapshots",
  {
    id: text("id").primaryKey(), // UUID

    // Foreign key to trips table (CASCADE on delete)
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),

    // Foreign key to fx_rates table (RESTRICT on delete - preserve audit trail)
    fxRateId: text("fx_rate_id")
      .notNull()
      .references(() => fxRates.id, { onDelete: "restrict" }),

    /**
     * Snapshot purpose/context
     * - 'trip_close': Rates at time of trip finalization
     * - 'settlement': Rates used for specific settlement calculation
     * - 'export': Rates bundled with trip export
     */
    snapshotType: text("snapshot_type").notNull(), // 'trip_close' | 'settlement' | 'export'

    /**
     * When this snapshot was created (ISO 8601)
     * - Allows tracking which rates were active at different points
     */
    snapshotAt: text("snapshot_at")
      .notNull()
      .default(sql`(datetime('now'))`),

    // Timestamps
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    // Index for trip-based lookups
    tripIdIdx: index("fx_rate_snapshots_trip_id_idx").on(table.tripId),
    // Index for rate-based lookups (find which trips used this rate)
    fxRateIdIdx: index("fx_rate_snapshots_fx_rate_id_idx").on(table.fxRateId),
  }),
);

// Export type inference for TypeScript
export type FxRate = typeof fxRates.$inferSelect;
export type NewFxRate = typeof fxRates.$inferInsert;
export type FxRateSnapshot = typeof fxRateSnapshots.$inferSelect;
export type NewFxRateSnapshot = typeof fxRateSnapshots.$inferInsert;

/**
 * HELPER TYPES FOR PROVIDERS
 */

/** Supported FX rate data sources */
export type FxRateSource =
  | "frankfurter"
  | "exchangerate-api"
  | "manual"
  | "sync";

/** Currency pair identifier */
export interface CurrencyPair {
  baseCurrency: string; // ISO 4217 code
  quoteCurrency: string; // ISO 4217 code
}

/** FX rate with metadata for provider usage */
export interface FxRateWithMetadata extends FxRate {
  /** Parsed metadata object (null if metadata is null/invalid JSON) */
  parsedMetadata: Record<string, unknown> | null;
  /** Age in days since fetchedAt */
  ageDays: number;
  /** Is this rate stale? (>7 days old, not manual) */
  isStale: boolean;
}
