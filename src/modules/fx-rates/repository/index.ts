/**
 * FX RATE REPOSITORY
 * LOCAL DATA ENGINEER: Offline-first FX rate management with ACID-safe writes
 */

import * as Crypto from "expo-crypto";
import { db } from "@db/client";
import {
  fxRates as fxRatesTable,
  type FxRate as FxRateRow,
  type FxRateSource,
} from "@db/schema/fx-rates";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { fxLogger } from "@utils/logger";

/**
 * Domain type for FX rate
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
 * Input for setting/updating a rate
 */
export interface SetFxRateInput {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: FxRateSource;
  fetchedAt?: string; // Defaults to now
  priority?: number; // Defaults based on source
  metadata?: Record<string, unknown>;
}

/**
 * Batch input for bulk updates (e.g., from API fetch)
 */
export interface BatchFxRateInput {
  rates: Array<{
    baseCurrency: string;
    quoteCurrency: string;
    rate: number;
  }>;
  source: FxRateSource;
  fetchedAt?: string; // Defaults to now
  metadata?: Record<string, unknown>;
}

/**
 * Map database row to domain type
 */
const mapFxRate = (row: FxRateRow): FxRate => ({
  id: row.id,
  baseCurrency: row.baseCurrency,
  quoteCurrency: row.quoteCurrency,
  rate: row.rate,
  source: row.source as FxRateSource,
  fetchedAt: row.fetchedAt,
  priority: row.priority,
  metadata: row.metadata ? tryParseJSON(row.metadata) : null,
  isArchived: row.isArchived,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * Try to parse JSON string, return null on failure
 */
const tryParseJSON = (jsonString: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(jsonString);
  } catch {
    fxLogger.warn("Invalid JSON in metadata", { jsonString });
    return null;
  }
};

/**
 * Get default priority for source
 */
const getDefaultPriority = (source: FxRateSource): number => {
  const priorities: Record<FxRateSource, number> = {
    manual: 100,
    frankfurter: 50,
    "exchangerate-api": 40,
    sync: 30,
  };
  return priorities[source] ?? 50;
};

/**
 * Get the most recent, highest priority rate for a currency pair
 * @param baseCurrency - Source currency (e.g., 'USD')
 * @param quoteCurrency - Target currency (e.g., 'EUR')
 * @returns FX rate or null if not found
 */
export const getRate = async (
  baseCurrency: string,
  quoteCurrency: string,
): Promise<FxRate | null> => {
  // Same currency = 1.0 (no DB lookup needed)
  if (baseCurrency === quoteCurrency) {
    const now = new Date().toISOString();
    fxLogger.debug("Same currency lookup", { baseCurrency, quoteCurrency });
    return {
      id: "same-currency",
      baseCurrency,
      quoteCurrency,
      rate: 1.0,
      source: "manual",
      fetchedAt: now,
      priority: 100,
      metadata: null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Query for non-archived rate, order by priority DESC, fetchedAt DESC
  const rows = await db
    .select()
    .from(fxRatesTable)
    .where(
      and(
        eq(fxRatesTable.baseCurrency, baseCurrency),
        eq(fxRatesTable.quoteCurrency, quoteCurrency),
        eq(fxRatesTable.isArchived, false),
      ),
    )
    .orderBy(desc(fxRatesTable.priority), desc(fxRatesTable.fetchedAt))
    .limit(1);

  if (!rows.length) {
    fxLogger.warn("FX rate not found", { baseCurrency, quoteCurrency });
    return null;
  }

  fxLogger.debug("FX rate loaded", {
    baseCurrency,
    quoteCurrency,
    rate: rows[0].rate,
  });
  return mapFxRate(rows[0]);
};

/**
 * Set or update a single FX rate
 * Archives old rates for the same pair and creates a new versioned entry
 *
 * @param input - Rate data with source
 * @returns Created FX rate
 */
export const setRate = async (input: SetFxRateInput): Promise<FxRate> => {
  const {
    baseCurrency,
    quoteCurrency,
    rate,
    source,
    fetchedAt,
    priority,
    metadata,
  } = input;

  if (rate <= 0) {
    fxLogger.error("Invalid FX rate", { baseCurrency, quoteCurrency, rate });
    const error = new Error("FX rate must be positive") as Error & {
      code: string;
    };
    error.code = "INVALID_FX_RATE";
    throw error;
  }

  const now = new Date().toISOString();
  const effectiveFetchedAt = fetchedAt ?? now;
  const effectivePriority = priority ?? getDefaultPriority(source);
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  fxLogger.debug("Setting FX rate", {
    baseCurrency,
    quoteCurrency,
    rate,
    source,
  });

  return db.transaction(async (tx) => {
    // Archive existing rates for this pair (if any)
    await tx
      .update(fxRatesTable)
      .set({ isArchived: true, updatedAt: now })
      .where(
        and(
          eq(fxRatesTable.baseCurrency, baseCurrency),
          eq(fxRatesTable.quoteCurrency, quoteCurrency),
          eq(fxRatesTable.isArchived, false),
        ),
      );

    // Insert new rate
    const [inserted] = await tx
      .insert(fxRatesTable)
      .values({
        id: Crypto.randomUUID(),
        baseCurrency,
        quoteCurrency,
        rate,
        source,
        fetchedAt: effectiveFetchedAt,
        priority: effectivePriority,
        metadata: metadataJson,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    fxLogger.info("FX rate created", {
      baseCurrency,
      quoteCurrency,
      rate,
      id: inserted.id,
    });
    return mapFxRate(inserted);
  });
};

/**
 * Batch update multiple FX rates (e.g., from API fetch)
 * Archives old rates and creates new versioned entries atomically
 *
 * @param input - Batch of rates with source
 * @returns Number of rates created
 */
export const batchUpdateRates = async (
  input: BatchFxRateInput,
): Promise<number> => {
  const { rates, source, fetchedAt, metadata } = input;
  const now = new Date().toISOString();
  const effectiveFetchedAt = fetchedAt ?? now;
  const effectivePriority = getDefaultPriority(source);
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  if (rates.length === 0) {
    fxLogger.warn("Batch update called with empty rates array");
    return 0;
  }

  fxLogger.debug("Batch updating FX rates", { count: rates.length, source });

  return db.transaction(async (tx) => {
    let created = 0;

    for (const { baseCurrency, quoteCurrency, rate } of rates) {
      if (rate <= 0) {
        fxLogger.warn("Skipping invalid rate in batch", {
          baseCurrency,
          quoteCurrency,
          rate,
        });
        continue;
      }

      // Archive existing rates for this pair
      await tx
        .update(fxRatesTable)
        .set({ isArchived: true, updatedAt: now })
        .where(
          and(
            eq(fxRatesTable.baseCurrency, baseCurrency),
            eq(fxRatesTable.quoteCurrency, quoteCurrency),
            eq(fxRatesTable.isArchived, false),
          ),
        );

      // Insert new rate
      await tx.insert(fxRatesTable).values({
        id: Crypto.randomUUID(),
        baseCurrency,
        quoteCurrency,
        rate,
        source,
        fetchedAt: effectiveFetchedAt,
        priority: effectivePriority,
        metadata: metadataJson,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });

      created++;
    }

    fxLogger.info("Batch FX rates updated", { count: created, source });
    return created;
  });
};

/**
 * Get all active (non-archived) FX rates for a specific base currency
 * Useful for displaying available rates or debugging
 *
 * @param baseCurrency - Base currency (e.g., 'USD')
 * @returns Array of FX rates from base currency
 */
export const getRatesForBaseCurrency = async (
  baseCurrency: string,
): Promise<FxRate[]> => {
  const rows = await db
    .select()
    .from(fxRatesTable)
    .where(
      and(
        eq(fxRatesTable.baseCurrency, baseCurrency),
        eq(fxRatesTable.isArchived, false),
      ),
    )
    .orderBy(desc(fxRatesTable.priority), desc(fxRatesTable.fetchedAt));

  fxLogger.debug("Loaded rates for base currency", {
    baseCurrency,
    count: rows.length,
  });
  return rows.map(mapFxRate);
};

/**
 * Get all active FX rates (for cache initialization)
 * @returns Array of all non-archived FX rates
 */
export const getAllActiveRates = async (): Promise<FxRate[]> => {
  const rows = await db
    .select()
    .from(fxRatesTable)
    .where(eq(fxRatesTable.isArchived, false))
    .orderBy(desc(fxRatesTable.priority), desc(fxRatesTable.fetchedAt));

  fxLogger.debug("Loaded all active rates", { count: rows.length });
  return rows.map(mapFxRate);
};

/**
 * Get staleness info for all active rates
 * @returns Object with oldest fetchedAt timestamp and total rate count
 */
export const getStalenessInfo = async (): Promise<{
  oldestFetchedAt: string | null;
  totalRates: number;
  staleRates: number;
}> => {
  const result = await db
    .select({
      oldestFetchedAt: sql<string>`MIN(${fxRatesTable.fetchedAt})`,
      totalRates: sql<number>`COUNT(*)`,
    })
    .from(fxRatesTable)
    .where(eq(fxRatesTable.isArchived, false));

  const oldestFetchedAt = result[0]?.oldestFetchedAt ?? null;
  const totalRates = result[0]?.totalRates ?? 0;

  // Count rates older than 7 days (excluding manual rates)
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const staleResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(fxRatesTable)
    .where(
      and(
        eq(fxRatesTable.isArchived, false),
        sql`${fxRatesTable.fetchedAt} < ${sevenDaysAgo}`,
        or(
          eq(fxRatesTable.source, "frankfurter"),
          eq(fxRatesTable.source, "exchangerate-api"),
          eq(fxRatesTable.source, "sync"),
        ),
      ),
    );

  const staleRates = staleResult[0]?.count ?? 0;

  return {
    oldestFetchedAt,
    totalRates,
    staleRates,
  };
};

/**
 * Archive a specific FX rate (useful for cleanup)
 * @param id - FX rate ID
 */
export const archiveRate = async (id: string): Promise<void> => {
  fxLogger.info("Archiving FX rate", { id });

  await db
    .update(fxRatesTable)
    .set({ isArchived: true, updatedAt: new Date().toISOString() })
    .where(eq(fxRatesTable.id, id));

  fxLogger.info("FX rate archived", { id });
};

/**
 * Repository export
 */
export const FxRateRepository = {
  getRate,
  setRate,
  batchUpdateRates,
  getRatesForBaseCurrency,
  getAllActiveRates,
  getStalenessInfo,
  archiveRate,
};
