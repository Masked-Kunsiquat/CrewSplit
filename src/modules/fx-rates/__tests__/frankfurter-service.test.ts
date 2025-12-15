/**
 * FRANKFURTER SERVICE TESTS
 * LOCAL DATA ENGINEER: Network handling, validation, and timeouts
 */

jest.mock('@utils/logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { fxLogger: logger };
});

import { FrankfurterService } from '../services/FrankfurterService';

describe('FrankfurterService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('fetchLatestRates returns parsed rate pairs', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 1,
        base: 'USD',
        date: '2024-01-10',
        rates: { EUR: 0.92, GBP: 0.8 },
      }),
    });

    const rates = await FrankfurterService.fetchLatestRates({
      baseCurrency: 'USD',
      targetCurrencies: ['EUR', 'GBP'],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/latest'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(rates).toEqual([
      { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: 0.92 },
      { baseCurrency: 'USD', quoteCurrency: 'GBP', rate: 0.8 },
    ]);
  });

  it('throws with API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ message: 'unsupported base' }),
    });

    await expect(FrankfurterService.fetchLatestRates()).rejects.toHaveProperty(
      'code',
      'FRANKFURTER_API_ERROR'
    );
  });

  it('throws when response shape is invalid', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD' }),
    });

    await expect(FrankfurterService.fetchLatestRates()).rejects.toHaveProperty('code', 'INVALID_RESPONSE');
  });

  it('times out with abort when request exceeds timeout', async () => {
    (global.fetch as jest.Mock).mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('Aborted');
          (error as any).name = 'AbortError';
          reject(error);
        });
      });
    });

    const promise = FrankfurterService.fetchLatestRates({ timeout: 1000 });
    jest.advanceTimersByTime(1100);

    await expect(promise).rejects.toHaveProperty('code', 'TIMEOUT');
  });

  it('fetchRate returns single pair and errors when missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 1,
        base: 'EUR',
        date: '2024-01-10',
        rates: { USD: 1.1 },
      }),
    });

    const pair = await FrankfurterService.fetchRate('EUR', 'USD');
    expect(pair).toEqual({ baseCurrency: 'EUR', quoteCurrency: 'USD', rate: 1.1 });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 1,
        base: 'EUR',
        date: '2024-01-10',
        rates: {},
      }),
    });

    await expect(FrankfurterService.fetchRate('EUR', 'GBP')).rejects.toHaveProperty(
      'code',
      'RATE_NOT_FOUND'
    );
  });

  it('checkAvailability returns boolean and handles failures', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    await expect(FrankfurterService.checkAvailability()).resolves.toBe(true);

    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    await expect(FrankfurterService.checkAvailability()).resolves.toBe(false);

    (global.fetch as jest.Mock).mockRejectedValue(new Error('network'));
    await expect(FrankfurterService.checkAvailability()).resolves.toBe(false);
  });
});
