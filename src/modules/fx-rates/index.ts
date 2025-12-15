/**
 * FX RATES MODULE EXPORTS
 * Foreign exchange rate management with offline-first caching
 */

// Repository (database layer)
export { FxRateRepository } from './repository';
export type { FxRate, SetFxRateInput, BatchFxRateInput } from './repository';

// Provider (in-memory cache layer)
export { CachedFxRateProvider, cachedFxRateProvider } from './provider';

// Services (API integration)
export { FrankfurterService, ExchangeRateApiService, FxRateService } from './services';
export type { UpdateRatesOptions, FetchResult } from './services';

// Hooks (React integration)
export { useFxRates } from './hooks';

// Types
export type { RatePair, StalenessInfo } from './types';
