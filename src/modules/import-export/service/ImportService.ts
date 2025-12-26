/**
 * SYSTEM ARCHITECT: Import Service
 * High-level import orchestration with conflict resolution
 */

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { db } from "@db/client";
import { entityRegistry } from "../core/registry";
import {
  ImportContext,
  ImportResult,
  ConflictStrategy,
  ExportFile,
} from "../core/types";
import {
  validateJsonStructure,
  ValidationException,
  InvalidExportFileError,
  UnsupportedVersionError,
} from "../core";
import { createAppError } from "@utils/errors";

const SUPPORTED_VERSIONS = ["1.0.0"];

/**
 * Import service - handles data import from JSON files
 */
export class ImportService {
  /**
   * Import trip data from JSON file (with user file picker)
   *
   * @param conflictResolution - Strategy for handling ID conflicts
   * @param options - Import options
   * @returns Import results for each entity
   */
  async importFromFile(
    conflictResolution: ConflictStrategy = "skip",
    options?: {
      validateForeignKeys?: boolean;
      dryRun?: boolean;
    },
  ): Promise<ImportResult[]> {
    // Pick file using document picker
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      throw createAppError("OPERATION_FAILED", "Import cancelled by user");
    }

    // Read file content
    const fileUri = result.assets[0].uri;
    const fileName = result.assets[0].name || "unknown";
    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Parse JSON with error handling
    let exportData: any;
    try {
      exportData = JSON.parse(content);
    } catch (error) {
      // Provide context for JSON parsing errors
      const preview =
        content.length > 100 ? `${content.slice(0, 100)}...` : content;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown parsing error";

      throw new InvalidExportFileError(
        `Failed to parse JSON from file "${fileName}": ${errorMessage}`,
        {
          fileName,
          fileUri,
          contentPreview: preview,
          originalError: errorMessage,
        },
      );
    }

    return this.importFromData(exportData, conflictResolution, options);
  }

  /**
   * Import from parsed export data
   *
   * @param exportData - Parsed export file data
   * @param conflictResolution - Strategy for handling ID conflicts
   * @param options - Import options
   * @returns Import results for each entity
   */
  async importFromData(
    exportData: any,
    conflictResolution: ConflictStrategy = "skip",
    options?: {
      validateForeignKeys?: boolean;
      dryRun?: boolean;
    },
  ): Promise<ImportResult[]> {
    // Phase 1: Validate JSON structure
    let validatedData: ExportFile;
    try {
      validatedData = validateJsonStructure(exportData);
    } catch (error) {
      if (error instanceof InvalidExportFileError) {
        throw error;
      }
      throw new InvalidExportFileError(
        "Invalid export file structure",
        error instanceof Error ? { message: error.message } : undefined,
      );
    }

    // Phase 2: Check version compatibility
    if (!SUPPORTED_VERSIONS.includes(validatedData.version)) {
      throw new UnsupportedVersionError(
        validatedData.version,
        SUPPORTED_VERSIONS,
      );
    }

    // Phase 3: Validate all entities
    const entities = entityRegistry.getInDependencyOrder();
    for (const entity of entities) {
      const records = validatedData.data[entity.name] ?? [];
      if (records.length === 0) continue;

      const validationErrors = entity.validate(records);
      if (validationErrors.length > 0) {
        throw new ValidationException(validationErrors);
      }
    }

    // Phase 4: Import in transaction (all or nothing)
    const results: ImportResult[] = [];

    // Import in transaction for atomicity
    await db.transaction(async (tx) => {
      // Create context with transaction
      const context: ImportContext = {
        conflictResolution,
        validateForeignKeys: options?.validateForeignKeys ?? true,
        dryRun: options?.dryRun ?? false,
        tx, // Pass transaction for rollback support
      };

      // Import in dependency order (parents before children)
      for (const entity of entities) {
        const records = validatedData.data[entity.name] ?? [];
        if (records.length === 0) {
          // Still record result for completeness
          results.push({
            entityName: entity.name,
            totalRecords: 0,
            successCount: 0,
            skippedCount: 0,
            errorCount: 0,
            errors: [],
          });
          continue;
        }

        try {
          const result = await entity.import(records, context);
          results.push(result);

          // Abort transaction on critical errors (unless dry run)
          if (result.errorCount > 0 && !context.dryRun) {
            // Log errors but continue (errors already recorded)
            console.warn(
              `Import warnings for ${entity.name}: ${result.errorCount} error(s)`,
            );
          }
        } catch (error) {
          // Unhandled error - abort transaction
          console.error(`Fatal error importing ${entity.name}:`, error);
          throw error;
        }
      }
    });

    return results;
  }

  /**
   * Preview import conflicts without writing to database
   * Performs dry-run validation and conflict detection
   *
   * @param exportData - Parsed export file data
   * @returns Summary of import conflicts
   */
  async previewImport(exportData: any): Promise<{
    exportInfo: {
      version: string;
      scope: string;
      exportedAt: string;
      tripName?: string;
    };
    entities: {
      name: string;
      totalRecords: number;
      conflicts: number;
    }[];
    totalRecords: number;
    totalConflicts: number;
  }> {
    // Validate JSON structure
    const validatedData = validateJsonStructure(exportData);

    // Check version compatibility
    if (!SUPPORTED_VERSIONS.includes(validatedData.version)) {
      throw new UnsupportedVersionError(
        validatedData.version,
        SUPPORTED_VERSIONS,
      );
    }

    // Perform dry run import to detect conflicts
    const results = await this.importFromData(exportData, "skip", {
      validateForeignKeys: true,
      dryRun: true,
    });

    // Build preview summary
    const entities = results.map((result) => ({
      name: result.entityName,
      totalRecords: result.totalRecords,
      conflicts: result.skippedCount + result.errorCount,
    }));

    const totalRecords = results.reduce((sum, r) => sum + r.totalRecords, 0);
    const totalConflicts = results.reduce(
      (sum, r) => sum + r.skippedCount + r.errorCount,
      0,
    );

    return {
      exportInfo: {
        version: validatedData.version,
        scope: validatedData.scope,
        exportedAt: validatedData.exportedAt,
        tripName: validatedData.metadata.tripName,
      },
      entities,
      totalRecords,
      totalConflicts,
    };
  }

  /**
   * Get import statistics from results
   */
  getImportSummary(results: ImportResult[]): {
    totalRecords: number;
    successCount: number;
    skippedCount: number;
    errorCount: number;
    hasErrors: boolean;
  } {
    return {
      totalRecords: results.reduce((sum, r) => sum + r.totalRecords, 0),
      successCount: results.reduce((sum, r) => sum + r.successCount, 0),
      skippedCount: results.reduce((sum, r) => sum + r.skippedCount, 0),
      errorCount: results.reduce((sum, r) => sum + r.errorCount, 0),
      hasErrors: results.some((r) => r.errorCount > 0),
    };
  }
}
