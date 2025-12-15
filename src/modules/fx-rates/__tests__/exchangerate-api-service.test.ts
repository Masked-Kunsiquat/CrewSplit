/**
 * EXCHANGERATE-API SERVICE TESTS
 * LOCAL DATA ENGINEER: Fallback source handling and errors
 */

jest.mock('@utils/logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { fxLogger: logger };
});

import { ExchangeRateApiService } from '../services/ExchangeRateApiService';

describe('ExchangeRateApiService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('fetchLatestRates returns parsed rate pairs (excludes base self-rate)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        base_code: 'USD',
        rates: { USD: 1, EUR: 0.93, GBP: 0.8 },
      }),
    });

    const rates = await ExchangeRateApiService.fetchLatestRates({
      baseCurrency: 'USD',
      targetCurrencies: ['EUR', 'GBP'],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/latest/USD'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(rates).toEqual([
      { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: 0.93 },
      { baseCurrency: 'USD', quoteCurrency: 'GBP', rate: 0.8 },
    ]);
  });

  it('throws when API reports error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'error',
        'error-type': 'invalid-key',
      }),
    });

    await expect(ExchangeRateApiService.fetchLatestRates()).rejects.toHaveProperty(
      'code',
      'EXCHANGERATE_API_ERROR'
    );
  });

  it('throws when response shape is invalid', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
      }),
    });

    await expect(ExchangeRateApiService.fetchLatestRates()).rejects.toHaveProperty('code', 'INVALID_RESPONSE');
  });

  it('times out requests using AbortController', async () => {
    (global.fetch as jest.Mock).mockImplementation((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('Aborted');
          (error as any).name = 'AbortError';
          reject(error);
        });
      });
    });

    const promise = ExchangeRateApiService.fetchLatestRates({ timeout: 500 });
    jest.advanceTimersByTime(600);

    await expect(promise).rejects.toHaveProperty('code', 'TIMEOUT');
  });

  it('fetchRate returns single pair and errors when missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        base_code: 'EUR',
        rates: { USD: 1.12 },
      }),
    });

    const pair = await ExchangeRateApiService.fetchRate('EUR', 'USD');
    expect(pair).toEqual({ baseCurrency: 'EUR', quoteCurrency: 'USD', rate: 1.12 });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        base_code: 'EUR',
        rates: { USD: 1.12 },
      }),
    });

    await expect(ExchangeRateApiService.fetchRate('EUR', 'GBP')).rejects.toHaveProperty(
      'code',
      'RATE_NOT_FOUND'
    );
  });

  it('checkAvailability returns boolean and tolerates network errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    await expect(ExchangeRateApiService.checkAvailability()).resolves.toBe(true);

    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    await expect(ExchangeRateApiService.checkAvailability()).resolves.toBe(false);

    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(ExchangeRateApiService.checkAvailability()).resolves.toBe(false);
  });
});
