/**
 * SETTLEMENT MODULE
 * Deterministic balance calculation and transaction minimization
 * MODELER: Owns all financial logic
 * SETTLEMENT INTEGRATION ENGINEER: Data layer integration
 * DISPLAY INTEGRATION ENGINEER: Display currency conversion
 */

export * from './types';
export * from './calculate-balances';
export * from './optimize-settlements';
export * from './normalize-shares';
export * from './hooks';
export * from './service/SettlementService';
export * from './service/DisplayCurrencyAdapter';
