/**
 * SYSTEM ARCHITECT: Core types for import/export system
 * Defines interfaces for extensible entity registration and data exchange
 */

import { db } from "@db/client";

/**
 * Transaction type from Drizzle ORM
 * This is the type of the `tx` parameter in db.transaction((tx) => {...})
 */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Entity scope determines when/how entity data is exported
 * - global: Always exported (user settings, system categories, FX rates)
 * - trip: Only exported when trip is selected (participants, expenses)
 * - both: Can be filtered by trip or exported globally (trips themselves)
 */
export type EntityScope = "global" | "trip" | "both";

/**
 * Export context provides filtering and scope information
 */
export interface ExportContext {
  /** Export scope type */
  scope: "single_trip" | "full_database" | "global_data";

  /** Trip ID for single_trip scope (required for single_trip) */
  tripId?: string;

  /** Include sample/demo data trips */
  includeSampleData?: boolean;

  /** Include archived trips and categories */
  includeArchivedData?: boolean;
}

/**
 * Import context controls how data is imported
 */
export interface ImportContext {
  /** Strategy for handling ID conflicts */
  conflictResolution: ConflictStrategy;

  /** Validate foreign key references before import */
  validateForeignKeys: boolean;

  /** Dry run - validate without writing to database */
  dryRun: boolean;

  /** Database transaction (required for rollback on error) */
  tx?: Transaction;
}

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy =
  | "skip" // Skip records with duplicate IDs
  | "replace" // Replace existing records (data loss risk)
  | "generate_new_ids"; // Generate new UUIDs (Phase 2 - requires FK cascading)

/**
 * Exportable entity interface
 * Each database table implements this for import/export support
 */
export interface ExportableEntity<T = any> {
  /** Entity name (matches table name) */
  name: string;

  /** Foreign key dependencies (entities that must be exported first) */
  dependencies: string[];

  /** Entity scope (global, trip, or both) */
  scope: EntityScope;

  /**
   * Export function: retrieve data from database
   * @param context - Export context (trip ID, filters, etc.)
   * @returns Array of entity records
   */
  export: (context: ExportContext) => Promise<T[]>;

  /**
   * Import function: write data to database
   * @param records - Array of entity records from JSON
   * @param context - Import context (conflict resolution, validation, etc.)
   * @returns Import result (success count, errors)
   */
  import: (records: T[], context: ImportContext) => Promise<ImportResult>;

  /**
   * Validate function: check data integrity before import
   * @param records - Array of entity records
   * @returns Validation errors (empty if valid)
   */
  validate: (records: T[]) => ValidationError[];

  /**
   * Transform function: migrate old schema to current version (optional)
   * @param records - Array of entity records from older export version
   * @param fromVersion - Source export version
   * @returns Transformed records
   */
  transform?: (records: T[], fromVersion: string) => Promise<T[]>;
}

/**
 * Import result for a single entity
 */
export interface ImportResult {
  /** Entity name */
  entityName: string;

  /** Total records in import file */
  totalRecords: number;

  /** Successfully imported records */
  successCount: number;

  /** Skipped records (duplicate IDs) */
  skippedCount: number;

  /** Failed imports (validation/constraint errors) */
  errorCount: number;

  /** Detailed error information */
  errors: ImportError[];
}

/**
 * Import error details
 */
export interface ImportError {
  /** Record ID (if available) */
  recordId?: string;

  /** Record index in import file */
  recordIndex: number;

  /** Field that caused error (if applicable) */
  field?: string;

  /** Human-readable error message */
  message: string;

  /** Error code for programmatic handling */
  code: ImportErrorCode;
}

/**
 * Import error codes
 */
export type ImportErrorCode =
  | "DUPLICATE_ID" // ID already exists in database
  | "MISSING_FK" // Foreign key reference not found
  | "VALIDATION_FAILED" // Entity validation failed
  | "INSERT_FAILED" // Database insert/update failed
  | "NOT_IMPLEMENTED"; // Feature not yet implemented

/**
 * Validation error details
 */
export interface ValidationError {
  /** Record index in import file */
  recordIndex: number;

  /** Field that failed validation */
  field: string;

  /** Human-readable error message */
  message: string;

  /** Validation error code */
  code: ValidationErrorCode;
}

/**
 * Validation error codes
 */
export type ValidationErrorCode =
  | "REQUIRED_FIELD" // Required field is missing
  | "INVALID_FORMAT" // Field format is invalid (e.g., bad date string)
  | "INVALID_TYPE" // Field type is wrong
  | "INVALID_VALUE"; // Field value is out of range or invalid

/**
 * Export file structure (JSON format)
 */
export interface ExportFile {
  /** Schema version for migration compatibility */
  version: string;

  /** When this export was created (ISO 8601 timestamp) */
  exportedAt: string;

  /** App version that created this export */
  appVersion: string;

  /** Export scope */
  scope: "single_trip" | "full_database" | "global_data";

  /** Export metadata */
  metadata: ExportMetadata;

  /** Entity data (keyed by entity name) */
  data: Record<string, any[]>;

  /** Optional: explicit dependency map */
  dependencies?: Record<string, string[]>;
}

/**
 * Export metadata
 */
export interface ExportMetadata {
  /** Trip ID (for single_trip exports) */
  tripId?: string;

  /** Trip name (for single_trip exports) */
  tripName?: string;

  /** Device ID that created export */
  exportedBy?: string;

  /** Data integrity checksum */
  checksum?: string;
}
