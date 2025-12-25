/**
 * SYSTEM ARCHITECT: Error classes for import/export system
 * Structured errors with codes for programmatic handling
 */

import { ValidationError } from "./types";

/**
 * Base import/export error
 */
export class ImportExportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = "ImportExportError";
  }
}

/**
 * Validation exception (thrown when entity validation fails)
 */
export class ValidationException extends ImportExportError {
  constructor(public validationErrors: ValidationError[]) {
    super(
      `Validation failed: ${validationErrors.length} error(s)`,
      "VALIDATION_FAILED",
      validationErrors,
    );
    this.name = "ValidationException";
  }
}

/**
 * Conflict exception (thrown when ID conflicts are detected)
 */
export class ConflictException extends ImportExportError {
  constructor(
    entityName: string,
    public conflictingIds: string[],
  ) {
    super(
      `ID conflicts detected in ${entityName}: ${conflictingIds.length} duplicate(s)`,
      "DUPLICATE_IDS",
      { entityName, conflictingIds },
    );
    this.name = "ConflictException";
  }
}

/**
 * Missing dependency error (thrown when foreign key references are missing)
 */
export class MissingDependencyError extends ImportExportError {
  constructor(
    entityName: string,
    public missingDependency: string,
    public missingIds: string[],
  ) {
    super(
      `Missing ${missingDependency} references in ${entityName}: ${missingIds.length} missing`,
      "MISSING_FOREIGN_KEY",
      { entityName, missingDependency, missingIds },
    );
    this.name = "MissingDependencyError";
  }
}

/**
 * Invalid export file error (thrown when JSON structure is invalid)
 */
export class InvalidExportFileError extends ImportExportError {
  constructor(message: string, details?: any) {
    super(message, "INVALID_EXPORT_FILE", details);
    this.name = "InvalidExportFileError";
  }
}

/**
 * Unsupported version error (thrown when export version is not supported)
 */
export class UnsupportedVersionError extends ImportExportError {
  constructor(
    public version: string,
    public supportedVersions: string[],
  ) {
    super(
      `Unsupported export version: ${version}. Supported: ${supportedVersions.join(", ")}`,
      "UNSUPPORTED_VERSION",
      { version, supportedVersions },
    );
    this.name = "UnsupportedVersionError";
  }
}
