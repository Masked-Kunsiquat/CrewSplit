/**
 * SYSTEM ARCHITECT: JSON schema validation for export files
 * Validates export file structure before attempting import
 */

import { ExportFile } from "./types";
import { InvalidExportFileError } from "./errors";

/**
 * Validate export file JSON structure
 * Throws InvalidExportFileError if validation fails
 *
 * @param data - Parsed JSON data
 * @returns Validated export file
 */
export function validateJsonStructure(data: any): ExportFile {
  // Check if data is an object
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new InvalidExportFileError("Export file must be a JSON object", {
      received: typeof data,
    });
  }

  // Check required top-level fields
  const requiredFields = [
    "version",
    "exportedAt",
    "appVersion",
    "scope",
    "data",
  ];
  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new InvalidExportFileError(`Missing required field: ${field}`);
    }
  }

  // Validate version
  if (typeof data.version !== "string" || !data.version) {
    throw new InvalidExportFileError("version must be a non-empty string");
  }

  // Validate appVersion
  if (typeof data.appVersion !== "string" || !data.appVersion) {
    throw new InvalidExportFileError("appVersion must be a non-empty string");
  }

  // Validate exportedAt (ISO 8601 timestamp)
  if (typeof data.exportedAt !== "string") {
    throw new InvalidExportFileError("exportedAt must be a string");
  }
  if (isNaN(Date.parse(data.exportedAt))) {
    throw new InvalidExportFileError(
      "exportedAt must be a valid ISO 8601 timestamp",
    );
  }

  // Validate scope
  const validScopes = ["single_trip", "full_database", "global_data"];
  if (!validScopes.includes(data.scope)) {
    throw new InvalidExportFileError(
      `scope must be one of: ${validScopes.join(", ")}`,
      { received: data.scope },
    );
  }

  // Validate data object
  if (!data.data || typeof data.data !== "object" || Array.isArray(data.data)) {
    throw new InvalidExportFileError("data must be an object");
  }

  // Validate each entity data is an array
  for (const [entityName, entityData] of Object.entries(data.data)) {
    if (!Array.isArray(entityData)) {
      throw new InvalidExportFileError(`data.${entityName} must be an array`, {
        received: typeof entityData,
      });
    }
  }

  // Validate metadata (if present)
  if (data.metadata !== undefined) {
    if (
      typeof data.metadata !== "object" ||
      Array.isArray(data.metadata) ||
      data.metadata === null
    ) {
      throw new InvalidExportFileError("metadata must be an object");
    }
  }

  return data as ExportFile;
}

/**
 * Validate required field presence
 * Used by entity validators
 */
export function validateRequired(
  value: any,
  fieldName: string,
  recordIndex: number,
): string | null {
  if (value === undefined || value === null || value === "") {
    return `${fieldName} is required (record ${recordIndex})`;
  }
  return null;
}

/**
 * Validate ISO 8601 date string
 */
export function validateISODate(
  value: string,
  fieldName: string,
  recordIndex: number,
): string | null {
  if (typeof value !== "string") {
    return `${fieldName} must be a string (record ${recordIndex})`;
  }
  if (isNaN(Date.parse(value))) {
    return `${fieldName} must be a valid ISO 8601 date (record ${recordIndex})`;
  }
  return null;
}

/**
 * Validate currency code (ISO 4217)
 * Simple check: 3 uppercase letters
 */
export function validateCurrencyCode(
  value: string,
  fieldName: string,
  recordIndex: number,
): string | null {
  if (typeof value !== "string") {
    return `${fieldName} must be a string (record ${recordIndex})`;
  }
  if (!/^[A-Z]{3}$/.test(value)) {
    return `${fieldName} must be a 3-letter ISO 4217 currency code (record ${recordIndex})`;
  }
  return null;
}

/**
 * Validate UUID format
 */
export function validateUUID(
  value: string,
  fieldName: string,
  recordIndex: number,
): string | null {
  if (typeof value !== "string") {
    return `${fieldName} must be a string (record ${recordIndex})`;
  }
  // Basic UUID validation (not strict RFC 4122)
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return `${fieldName} must be a valid UUID (record ${recordIndex})`;
  }
  return null;
}
