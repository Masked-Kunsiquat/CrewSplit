/**
 * SETTLEMENT MODULE
 * Deterministic balance calculation and transaction minimization
 * MODELER: Owns all financial logic
 * SETTLEMENT INTEGRATION ENGINEER: Connects algorithms to data layer
 */

export * from './types';
export * from './calculate-balances';
export * from './optimize-settlements';
export * from './normalize-shares';
export * from './service/SettlementService';
export * from './hooks';
