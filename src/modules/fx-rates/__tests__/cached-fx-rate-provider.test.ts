/**
 * CACHED FX RATE PROVIDER TESTS
 * LOCAL DATA ENGINEER: Cache correctness and synchronous access
 */

import {
  mockDb,
  createRateRow,
} from '../test-utils/mock-db';

jest.mock('@db/client', () => ({
  db: mockDb,
}));

jest.mock('@db/schema/fx-rates', () => {
  const { mockFxRatesTable } = require('../test-utils/mock-db');
  return { fxRates: mockFxRatesTable };
});

jest.mock('drizzle-orm', () => {
  const { drizzleOrmMock: mockDrizzleOrm } = require('../test-utils/mock-db');
  return mockDrizzleOrm;
});

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'manual-uuid'),
}));

jest.mock('@utils/logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { fxLogger: logger };
});

import { CachedFxRateProvider } from '../provider/cached-fx-rate-provider';
import { FxRateRepository } from '../repository';

describe('CachedFxRateProvider', () => {
  const now = '2024-01-10T00:00:00.000Z';

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    mockDb.reset([
      createRateRow({
        id: 'usd-eur',
        baseCurrency: 'USD',
        quoteCurrency: 'EUR',
        rate: 0.9,
        source: 'frankfurter',
        fetchedAt: '2024-01-05T00:00:00.000Z',
      }),
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes once and loads cache from repository', async () => {
    const provider = new CachedFxRateProvider();
    await provider.initialize();

    expect(provider.isInitialized()).toBe(true);
    expect(provider.getCacheSize()).toBe(1);
    expect(provider.getRate('USD', 'EUR')).toBe(0.9);

    await provider.initialize(); // no-op second call
    expect(provider.getCacheSize()).toBe(1);
  });

  it('returns 1.0 for same currency and throws for missing rate', async () => {
    const provider = new CachedFxRateProvider();
    await provider.initialize();

    expect(provider.getRate('USD', 'USD')).toBe(1);
    expect(provider.hasRate('USD', 'USD')).toBe(true);
    expect(provider.hasRate('EUR', 'GBP')).toBe(false);
    expect(() => provider.getRate('EUR', 'GBP')).toThrow('No exchange rate available');
  });

  it('setManualRate persists and updates cache immediately', async () => {
    const provider = new CachedFxRateProvider();
    await provider.initialize();

    await provider.setManualRate('EUR', 'GBP', 0.85);
    expect(provider.getRate('EUR', 'GBP')).toBe(0.85);
    expect(provider.getSource('EUR', 'GBP')).toBe('manual');

    const persisted = mockDb.rows.find(
      (r) => r.baseCurrency === 'EUR' && r.quoteCurrency === 'GBP' && !r.isArchived
    );
    expect(persisted).toBeTruthy();
    expect(persisted?.source).toBe('manual');
  });

  it('refreshCache reloads all active rates and clears stale entries', async () => {
    const provider = new CachedFxRateProvider();
    await provider.initialize();

    // Add a new DB row that should replace cache contents
    mockDb.reset([
      createRateRow({
        id: 'usd-jpy',
        baseCurrency: 'USD',
        quoteCurrency: 'JPY',
        rate: 140,
        source: 'frankfurter',
      }),
    ]);

    await provider.refreshCache();
    expect(provider.getCacheSize()).toBe(1);
    expect(provider.hasRate('USD', 'EUR')).toBe(false);
    expect(provider.getRate('USD', 'JPY')).toBe(140);
  });

  it('getLastUpdated and getSource surface cached metadata', async () => {
    const provider = new CachedFxRateProvider();
    await provider.initialize();

    expect(provider.getLastUpdated('USD', 'EUR')).toBe('2024-01-05T00:00:00.000Z');
    expect(provider.getSource('USD', 'EUR')).toBe('frankfurter');
    expect(provider.getLastUpdated('USD', 'USD')).toBe(now);
  });
});
