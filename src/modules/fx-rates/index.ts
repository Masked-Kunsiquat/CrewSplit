/**
 * FX RATES MODULE EXPORTS
 * Foreign exchange rate management with offline-first caching
 */

// Repository (database layer)
export { FxRateRepository } from './repository';
export type { FxRate, SetFxRateInput, BatchFxRateInput } from './repository';

// Provider (in-memory cache layer)
export { CachedFxRateProvider, cachedFxRateProvider } from './provider';

// Types
export type { RatePair, StalenessInfo } from './types';
