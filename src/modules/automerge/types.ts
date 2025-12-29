/**
 * AUTOMERGE MODULE - Type Definitions
 * Domain types for Automerge integration
 */

// Re-export engine types for convenience
export type {
  TripAutomergeDoc,
  TripParticipant,
  TripExpense,
  TripExpenseSplit,
  TripSettlement,
  TripMetadata,
} from "./engine/doc-schema";

export { CURRENT_SCHEMA_VERSION } from "./engine/doc-schema";

/**
 * Result of loading an Automerge document
 */
export interface LoadDocResult<T> {
  doc: T;
  exists: boolean;
}

/**
 * Options for saving an Automerge document
 */
export interface SaveDocOptions {
  overwrite?: boolean;
}

/**
 * Automerge operation metadata
 */
export interface OperationMetadata {
  timestamp: number;
  message?: string;
  actor?: string;
}

/**
 * Error codes for Automerge operations
 */
export type AutomergeErrorCode =
  | "DOC_NOT_FOUND"
  | "DOC_INVALID"
  | "SAVE_FAILED"
  | "LOAD_FAILED"
  | "INVALID_SCHEMA_VERSION"
  | "VALIDATION_FAILED";
