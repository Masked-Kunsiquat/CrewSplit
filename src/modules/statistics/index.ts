/**
 * STATISTICS MODULE - Unified Exports
 *
 * Exposes:
 * - Types
 * - Engine (pure math functions)
 * - Service layer
 *
 * Repository is kept internal to enforce orchestration via the service.
 */

// ============================================================================
// TYPES
// ============================================================================
export * from "./types";

// ============================================================================
// ENGINE (Pure Math Layer)
// ============================================================================
export * from "./engine";

// ============================================================================
// SERVICE LAYER
// ============================================================================
export * from "./service/StatisticsService";
