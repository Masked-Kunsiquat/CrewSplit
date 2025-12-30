/**
 * AUTOMERGE MODULE - Main Public API
 * Local-first data layer with built-in change history using Automerge CRDTs
 *
 * Architecture:
 * - Engine: Pure functions for document operations
 * - Service: AutomergeManager for document lifecycle
 * - Repository: Filesystem storage
 * - Hooks: React integration
 */

// Engine exports
export * from "./engine";

// Service exports
export * from "./service";

// Repository exports
export * from "./repository";

// Hooks exports
export * from "./hooks";

// Type exports
export type {
  LoadDocResult,
  SaveDocOptions,
  OperationMetadata,
  AutomergeErrorCode,
} from "./types";
