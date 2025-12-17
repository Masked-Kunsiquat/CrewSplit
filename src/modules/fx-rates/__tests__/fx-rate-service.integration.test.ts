/**
 * FX RATE SERVICE INTEGRATION TESTS
 * LOCAL DATA ENGINEER: Repository ↔ service orchestration and fallback
 */

import {
  mockDb,
  mockFxRatesTable,
  drizzleOrmMock as mockDrizzleOrm,
} from "../test-utils/mock-db";
import { FxRateService } from "../services/fx-rate-service";
import { cachedFxRateProvider } from "../provider/cached-fx-rate-provider";

jest.mock("@db/client", () => ({
  db: mockDb,
}));

jest.mock("@db/schema/fx-rates", () => ({
  fxRates: mockFxRatesTable,
}));

jest.mock("drizzle-orm", () => mockDrizzleOrm);

jest.mock("@utils/logger", () => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { fxLogger: logger };
});

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "uuid-seed"),
}));

const mockFrankfurterLatest = jest.fn();
const mockExchangeRateLatest = jest.fn();

jest.mock("../services/frankfurter-service", () => ({
  FrankfurterService: {
    fetchLatestRates: (...args: any[]) => mockFrankfurterLatest(...args),
    checkAvailability: jest.fn(async () => true),
  },
}));

jest.mock("../services/exchange-rate-api-service", () => ({
  ExchangeRateApiService: {
    fetchLatestRates: (...args: any[]) => mockExchangeRateLatest(...args),
    getAttributionText: () => "Exchange rates by ExchangeRate-API",
    checkAvailability: jest.fn(async () => true),
  },
}));

describe("FxRateService integration", () => {
  const now = "2024-01-10T00:00:00.000Z";

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    mockDb.reset();
    mockFrankfurterLatest.mockReset();
    mockExchangeRateLatest.mockReset();
    cachedFxRateProvider.clearCache();
    (cachedFxRateProvider as any).initialized = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("persists rates from Frankfurter and returns metadata", async () => {
    mockFrankfurterLatest.mockResolvedValue([
      { baseCurrency: "USD", quoteCurrency: "EUR", rate: 0.9 },
      { baseCurrency: "USD", quoteCurrency: "GBP", rate: 0.8 },
    ]);

    const result = await FxRateService.updateRates({ baseCurrency: "USD" });

    expect(result.source).toBe("frankfurter");
    expect(result.persistedCount).toBe(2);
    expect(mockDb.rows.filter((r) => !r.isArchived)).toHaveLength(2);
  });

  it("falls back to ExchangeRate-API when Frankfurter fails", async () => {
    mockFrankfurterLatest.mockRejectedValue(new Error("Frankfurter down"));
    mockExchangeRateLatest.mockResolvedValue([
      { baseCurrency: "USD", quoteCurrency: "CAD", rate: 1.35 },
    ]);

    const result = await FxRateService.updateRates({ baseCurrency: "USD" });

    expect(result.source).toBe("exchangerate-api");
    expect(result.persistedCount).toBe(1);
    expect(mockDb.rows.find((r) => r.quoteCurrency === "CAD")).toBeTruthy();
  });

  it("throws when all sources fail", async () => {
    mockFrankfurterLatest.mockRejectedValue(new Error("Frankfurter down"));
    mockExchangeRateLatest.mockRejectedValue(new Error("Fallback down"));

    await expect(FxRateService.updateRates()).rejects.toHaveProperty(
      "code",
      "ALL_SOURCES_FAILED",
    );
    expect(mockDb.rows).toHaveLength(0);
  });

  it("updateCommonRates runs multiple fetches but returns first result", async () => {
    mockFrankfurterLatest.mockResolvedValue([
      { baseCurrency: "USD", quoteCurrency: "EUR", rate: 0.9 },
      { baseCurrency: "USD", quoteCurrency: "JPY", rate: 140 },
    ]);

    const result = await FxRateService.updateCommonRates();
    expect(result.source).toBe("frankfurter");
    expect(mockDb.rows.filter((r) => !r.isArchived)).toHaveLength(2);
  });

  it("provider cache reflects persisted rates after refresh", async () => {
    mockFrankfurterLatest.mockResolvedValue([
      { baseCurrency: "USD", quoteCurrency: "EUR", rate: 0.9 },
    ]);

    await FxRateService.updateRates({ baseCurrency: "USD" });
    await cachedFxRateProvider.initialize();
    await cachedFxRateProvider.refreshCache();

    expect(cachedFxRateProvider.getRate("USD", "EUR")).toBe(0.9);
    expect(cachedFxRateProvider.hasRate("USD", "GBP")).toBe(false);
  });
});
