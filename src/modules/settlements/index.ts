/**
 * SETTLEMENTS MODULE - Unified Exports
 *
 * This module combines:
 * - Pure math layer (settlement engine) - balance calculation & transaction optimization
 * - Service layer - integration with data repositories
 * - Database layer - settlement transaction records (CRUD)
 * - Hooks - React integration
 * - Screens - UI components
 *
 * Architecture:
 * - engine/ - Pure math functions (MODELER)
 * - service/ - Data integration (SETTLEMENT INTEGRATION ENGINEER)
 * - repository/ - Database access (LOCAL DATA ENGINEER)
 * - hooks/ - React hooks (UI integration)
 * - screens/ - UI screens (UI/UX ENGINEER)
 */

// ============================================================================
// TYPES
// ============================================================================
export * from "./types";

// ============================================================================
// ENGINE (Pure Math Layer)
// ============================================================================
export * from "./engine/calculate-balances";
export * from "./engine/normalize-shares";
export * from "./engine/optimize-settlements";

// ============================================================================
// SERVICE LAYER
// ============================================================================
export * from "./service/SettlementService";
export * from "./service/DisplayCurrencyAdapter";

// ============================================================================
// REPOSITORY (Database Layer)
// ============================================================================
export * from "./repository";

// ============================================================================
// HOOKS (React Integration)
// ============================================================================
export * from "./hooks";

// ============================================================================
// SCREENS (UI Layer)
// ============================================================================
export * from "./screens";

// ============================================================================
// COMPONENTS (UI Elements)
// ============================================================================
export * from "./components";
