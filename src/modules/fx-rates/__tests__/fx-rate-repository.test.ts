/**
 * FX RATE REPOSITORY TESTS
 * LOCAL DATA ENGINEER: ACID safety, versioning, priority selection
 */

import {
  mockDb,
  createRateRow,
  mockFxRatesTable,
  drizzleOrmMock as mockDrizzleOrm,
} from "../test-utils/mock-db";
import { FxRateRepository } from "../repository";

jest.mock("@db/client", () => ({
  db: mockDb,
}));

jest.mock("@db/schema/fx-rates", () => ({
  fxRates: mockFxRatesTable,
  fxRateSnapshots: {},
}));

jest.mock("drizzle-orm", () => mockDrizzleOrm);

jest.mock("expo-crypto", () => {
  let counter = 0;
  return {
    randomUUID: jest.fn(() => `uuid-${++counter}`),
  };
});

jest.mock("@utils/logger", () => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { fxLogger: logger };
});

describe("FxRateRepository", () => {
  const now = "2024-01-10T00:00:00.000Z";

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    mockDb.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns identity rate for same currency", async () => {
    const rate = await FxRateRepository.getRate("USD", "USD");
    expect(rate).toMatchObject({
      rate: 1,
      baseCurrency: "USD",
      quoteCurrency: "USD",
      isArchived: false,
    });
  });

  it("selects highest priority then newest fetchedAt", async () => {
    mockDb.reset([
      createRateRow({
        id: "low-priority-newer",
        baseCurrency: "USD",
        quoteCurrency: "EUR",
        priority: 40,
        fetchedAt: "2024-01-05T00:00:00.000Z",
        rate: 0.8,
      }),
      createRateRow({
        id: "high-priority-older",
        baseCurrency: "USD",
        quoteCurrency: "EUR",
        priority: 60,
        fetchedAt: "2024-01-02T00:00:00.000Z",
        rate: 0.85,
      }),
    ]);

    const rate = await FxRateRepository.getRate("USD", "EUR");
    expect(rate?.id).toBe("high-priority-older");
    expect(rate?.rate).toBe(0.85);
  });

  it("archives previous rate and inserts new version via setRate", async () => {
    mockDb.reset([
      createRateRow({
        id: "existing",
        baseCurrency: "USD",
        quoteCurrency: "CAD",
        rate: 1.3,
        priority: 40,
        fetchedAt: "2024-01-05T00:00:00.000Z",
      }),
    ]);

    const created = await FxRateRepository.setRate({
      baseCurrency: "USD",
      quoteCurrency: "CAD",
      rate: 1.25,
      source: "manual",
      metadata: { note: "user override" },
    });

    const archived = mockDb.rows.find((r) => r.id === "existing");
    expect(archived?.isArchived).toBe(true);
    expect(created).toMatchObject({
      baseCurrency: "USD",
      quoteCurrency: "CAD",
      rate: 1.25,
      source: "manual",
      priority: 100, // manual priority default
    });
    expect(
      JSON.parse(
        mockDb.rows.find((r) => r.id === created.id)?.metadata ?? "{}",
      ),
    ).toEqual({
      note: "user override",
    });
  });

  it("rejects invalid rate input", async () => {
    await expect(
      FxRateRepository.setRate({
        baseCurrency: "USD",
        quoteCurrency: "CAD",
        rate: 0,
        source: "manual",
      }),
    ).rejects.toHaveProperty("code", "INVALID_FX_RATE");
  });

  it("batchUpdateRates archives old rows and skips invalid entries", async () => {
    mockDb.reset([
      createRateRow({
        id: "old",
        baseCurrency: "EUR",
        quoteCurrency: "GBP",
        rate: 0.9,
        fetchedAt: "2024-01-01T00:00:00.000Z",
      }),
    ]);

    const createdCount = await FxRateRepository.batchUpdateRates({
      source: "frankfurter",
      rates: [
        { baseCurrency: "EUR", quoteCurrency: "GBP", rate: 0.91 },
        { baseCurrency: "EUR", quoteCurrency: "CHF", rate: -1 }, // invalid
      ],
      fetchedAt: "2024-01-09T00:00:00.000Z",
      metadata: { batch: true },
    });

    expect(createdCount).toBe(1);

    const oldRow = mockDb.rows.find((r) => r.id === "old");
    expect(oldRow?.isArchived).toBe(true);

    const newRow = mockDb.rows.find(
      (r) =>
        r.baseCurrency === "EUR" && r.quoteCurrency === "GBP" && !r.isArchived,
    );
    expect(newRow).toMatchObject({
      source: "frankfurter",
      priority: 50,
      fetchedAt: "2024-01-09T00:00:00.000Z",
    });
    expect(newRow?.metadata).toBe(JSON.stringify({ batch: true }));
  });

  it("getAllActiveRates returns non-archived ordered by priority then fetchedAt", async () => {
    mockDb.reset([
      createRateRow({
        id: "archived",
        isArchived: true,
        baseCurrency: "USD",
        quoteCurrency: "JPY",
        priority: 70,
        fetchedAt: "2024-01-02T00:00:00.000Z",
      }),
      createRateRow({
        id: "newer-lower-priority",
        baseCurrency: "USD",
        quoteCurrency: "JPY",
        priority: 40,
        fetchedAt: "2024-01-08T00:00:00.000Z",
      }),
      createRateRow({
        id: "older-high-priority",
        baseCurrency: "USD",
        quoteCurrency: "JPY",
        priority: 90,
        fetchedAt: "2024-01-01T00:00:00.000Z",
      }),
    ]);

    const rates = await FxRateRepository.getAllActiveRates();
    expect(rates.map((r) => r.id)).toEqual([
      "older-high-priority",
      "newer-lower-priority",
    ]);
  });

  it("getStalenessInfo counts stale API rates older than 1 day", async () => {
    const now = new Date();
    const fresh = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours ago (fresh)
    const staleApi = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago (stale)
    const manualOld = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago (but manual)

    mockDb.reset([
      createRateRow({
        id: "fresh",
        fetchedAt: fresh,
        source: "frankfurter",
      }),
      createRateRow({
        id: "stale-api",
        fetchedAt: staleApi,
        source: "exchangerate-api",
      }),
      createRateRow({
        id: "manual-old",
        fetchedAt: manualOld,
        source: "manual",
      }),
    ]);

    const info = await FxRateRepository.getStalenessInfo();
    expect(info.totalRates).toBe(3);
    expect(info.staleRates).toBe(1); // only stale-api is counted (manual excluded)
    expect(info.oldestFetchedAt).toBe(manualOld);
  });

  it("getStalenessInfo includes rates exactly 1 day old as stale", async () => {
    // Edge case: rate fetched exactly 1 day ago should be marked as stale
    const exactlyOneDayAgo = new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000,
    ).toISOString();

    mockDb.reset([
      createRateRow({
        id: "exactly-one-day",
        fetchedAt: exactlyOneDayAgo,
        source: "frankfurter",
      }),
    ]);

    const info = await FxRateRepository.getStalenessInfo();
    expect(info.staleRates).toBe(1); // Should be counted as stale (>=1 day)
  });

  it("archives specific rate by id", async () => {
    mockDb.reset([
      createRateRow({
        id: "to-archive",
        baseCurrency: "USD",
        quoteCurrency: "MXN",
        isArchived: false,
      }),
    ]);

    await FxRateRepository.archiveRate("to-archive");

    expect(mockDb.rows.find((r) => r.id === "to-archive")?.isArchived).toBe(
      true,
    );
  });
});
