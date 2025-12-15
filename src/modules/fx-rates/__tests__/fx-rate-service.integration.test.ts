/**
 * FX RATE SERVICE INTEGRATION TESTS
 * LOCAL DATA ENGINEER: Repository ↔ service orchestration and fallback
 */

import { mockDb, fxRatesTable, drizzleOrmMock } from './mockDb';

jest.mock('@db/client', () => ({
  db: mockDb,
}));

jest.mock('@db/schema/fx-rates', () => ({
  fxRates: fxRatesTable,
}));

jest.mock('drizzle-orm', () => drizzleOrmMock);

jest.mock('@utils/logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { fxLogger: logger };
});

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'uuid-seed'),
}));

const frankfurterLatest = jest.fn();
const exchangeRateLatest = jest.fn();

jest.mock('../services/FrankfurterService', () => ({
  FrankfurterService: {
    fetchLatestRates: (...args: any[]) => frankfurterLatest(...args),
    checkAvailability: jest.fn(async () => true),
  },
}));

jest.mock('../services/ExchangeRateApiService', () => ({
  ExchangeRateApiService: {
    fetchLatestRates: (...args: any[]) => exchangeRateLatest(...args),
    getAttributionText: () => 'Exchange rates by ExchangeRate-API',
    checkAvailability: jest.fn(async () => true),
  },
}));

import { FxRateService } from '../services/FxRateService';
import { cachedFxRateProvider } from '../provider/CachedFxRateProvider';

describe('FxRateService integration', () => {
  const now = '2024-01-10T00:00:00.000Z';

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    mockDb.reset();
    frankfurterLatest.mockReset();
    exchangeRateLatest.mockReset();
    cachedFxRateProvider.clearCache();
    (cachedFxRateProvider as any).initialized = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('persists rates from Frankfurter and returns metadata', async () => {
    frankfurterLatest.mockResolvedValue([
      { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: 0.9 },
      { baseCurrency: 'USD', quoteCurrency: 'GBP', rate: 0.8 },
    ]);

    const result = await FxRateService.updateRates({ baseCurrency: 'USD' });

    expect(result.source).toBe('frankfurter');
    expect(result.persistedCount).toBe(2);
    expect(mockDb.rows.filter((r) => !r.isArchived)).toHaveLength(2);
  });

  it('falls back to ExchangeRate-API when Frankfurter fails', async () => {
    frankfurterLatest.mockRejectedValue(new Error('Frankfurter down'));
    exchangeRateLatest.mockResolvedValue([{ baseCurrency: 'USD', quoteCurrency: 'CAD', rate: 1.35 }]);

    const result = await FxRateService.updateRates({ baseCurrency: 'USD' });

    expect(result.source).toBe('exchangerate-api');
    expect(result.persistedCount).toBe(1);
    expect(mockDb.rows.find((r) => r.quoteCurrency === 'CAD')).toBeTruthy();
  });

  it('throws when all sources fail', async () => {
    frankfurterLatest.mockRejectedValue(new Error('Frankfurter down'));
    exchangeRateLatest.mockRejectedValue(new Error('Fallback down'));

    await expect(FxRateService.updateRates()).rejects.toHaveProperty('code', 'ALL_SOURCES_FAILED');
    expect(mockDb.rows).toHaveLength(0);
  });

  it('updateCommonRates runs multiple fetches but returns first result', async () => {
    frankfurterLatest.mockResolvedValue([
      { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: 0.9 },
      { baseCurrency: 'USD', quoteCurrency: 'JPY', rate: 140 },
    ]);

    const result = await FxRateService.updateCommonRates();
    expect(result.source).toBe('frankfurter');
    expect(mockDb.rows.filter((r) => !r.isArchived)).toHaveLength(2);
  });

  it('provider cache reflects persisted rates after refresh', async () => {
    frankfurterLatest.mockResolvedValue([{ baseCurrency: 'USD', quoteCurrency: 'EUR', rate: 0.9 }]);

    await FxRateService.updateRates({ baseCurrency: 'USD' });
    await cachedFxRateProvider.initialize();
    await cachedFxRateProvider.refreshCache();

    expect(cachedFxRateProvider.getRate('USD', 'EUR')).toBe(0.9);
    expect(cachedFxRateProvider.hasRate('USD', 'GBP')).toBe(false);
  });
});
