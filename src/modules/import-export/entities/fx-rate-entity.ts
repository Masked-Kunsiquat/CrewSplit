/**
 * LOCAL DATA ENGINEER: FxRate entity export/import logic
 */

import { db } from "@db/client";
import { fxRates as fxRatesTable, FxRate } from "@db/schema/fx-rates";
import { eq, and } from "drizzle-orm";
import {
  ExportableEntity,
  ExportContext,
  ImportContext,
  ImportResult,
  ValidationError,
} from "../core/types";
import {
  validateRequired,
  validateUUID,
  validateISODate,
  validateCurrencyCode,
} from "../core/validators";

export const fxRateEntity: ExportableEntity<FxRate> = {
  name: "fxRates",
  dependencies: [], // Global data - no dependencies
  scope: "global", // FX rates are always global

  async export(context: ExportContext): Promise<FxRate[]> {
    // Build query with filters
    const conditions = [];

    // FX rates are always global - export all for currency conversions
    // Exclude archived rates (unless explicitly included)
    if (!context.includeArchivedData) {
      conditions.push(eq(fxRatesTable.isArchived, false));
    }

    // Execute query
    let query = db.select().from(fxRatesTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const rows = await query;

    // Sort by ID for deterministic export
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  },

  async import(
    records: FxRate[],
    context: ImportContext,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      entityName: "fxRates",
      totalRecords: records.length,
      successCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
    };

    if (context.dryRun) {
      return result; // Validation only
    }

    // Use transaction if provided, otherwise fall back to global db
    const dbClient = context.tx ?? db;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        // Check for ID conflicts
        const existing = await dbClient
          .select()
          .from(fxRatesTable)
          .where(eq(fxRatesTable.id, record.id))
          .limit(1);

        if (existing.length > 0) {
          // Handle conflict based on strategy
          if (context.conflictResolution === "skip") {
            result.skippedCount++;
            continue;
          } else if (context.conflictResolution === "replace") {
            // Update existing record
            await dbClient
              .update(fxRatesTable)
              .set({
                baseCurrency: record.baseCurrency,
                quoteCurrency: record.quoteCurrency,
                rate: record.rate,
                source: record.source,
                fetchedAt: record.fetchedAt,
                priority: record.priority,
                metadata: record.metadata,
                isArchived: record.isArchived,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(fxRatesTable.id, record.id));

            result.successCount++;
          } else if (context.conflictResolution === "generate_new_ids") {
            const error = new Error(
              `Conflict resolution strategy 'generate_new_ids' is not yet implemented for entity 'fxRates'`,
            ) as Error & { code: string };
            error.code = "NOT_IMPLEMENTED";
            throw error;
          }
        } else {
          // No conflict - insert new record
          await dbClient.insert(fxRatesTable).values(record);
          result.successCount++;
        }
      } catch (error) {
        // Re-throw configuration errors immediately (don't continue)
        if (
          error instanceof Error &&
          (error as Error & { code?: string }).code === "NOT_IMPLEMENTED"
        ) {
          throw error;
        }

        result.errorCount++;
        result.errors.push({
          recordId: record.id,
          recordIndex: i,
          message: error instanceof Error ? error.message : "Unknown error",
          code: "INSERT_FAILED",
        });
      }
    }

    return result;
  },

  validate(records: FxRate[]): ValidationError[] {
    const errors: ValidationError[] = [];

    const validSources = ["frankfurter", "exchangerate-api", "manual", "sync"];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Validate ID
      const idError = validateUUID(record.id, "id", i);
      if (idError) {
        errors.push({
          recordIndex: i,
          field: "id",
          message: idError,
          code: "INVALID_FORMAT",
        });
      }

      // Validate baseCurrency
      const baseCurrencyError = validateRequired(
        record.baseCurrency,
        "baseCurrency",
        i,
      );
      if (baseCurrencyError) {
        errors.push({
          recordIndex: i,
          field: "baseCurrency",
          message: baseCurrencyError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const baseCurrencyFormatError = validateCurrencyCode(
          record.baseCurrency,
          "baseCurrency",
          i,
        );
        if (baseCurrencyFormatError) {
          errors.push({
            recordIndex: i,
            field: "baseCurrency",
            message: baseCurrencyFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate quoteCurrency
      const quoteCurrencyError = validateRequired(
        record.quoteCurrency,
        "quoteCurrency",
        i,
      );
      if (quoteCurrencyError) {
        errors.push({
          recordIndex: i,
          field: "quoteCurrency",
          message: quoteCurrencyError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const quoteCurrencyFormatError = validateCurrencyCode(
          record.quoteCurrency,
          "quoteCurrency",
          i,
        );
        if (quoteCurrencyFormatError) {
          errors.push({
            recordIndex: i,
            field: "quoteCurrency",
            message: quoteCurrencyFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate rate
      const rateError = validateRequired(record.rate, "rate", i);
      if (rateError) {
        errors.push({
          recordIndex: i,
          field: "rate",
          message: rateError,
          code: "REQUIRED_FIELD",
        });
      } else if (typeof record.rate !== "number") {
        errors.push({
          recordIndex: i,
          field: "rate",
          message: `rate must be a number (record ${i})`,
          code: "INVALID_TYPE",
        });
      } else if (record.rate <= 0) {
        errors.push({
          recordIndex: i,
          field: "rate",
          message: `rate must be positive (record ${i})`,
          code: "INVALID_VALUE",
        });
      }

      // Validate source
      const sourceError = validateRequired(record.source, "source", i);
      if (sourceError) {
        errors.push({
          recordIndex: i,
          field: "source",
          message: sourceError,
          code: "REQUIRED_FIELD",
        });
      } else if (!validSources.includes(record.source)) {
        errors.push({
          recordIndex: i,
          field: "source",
          message: `source must be one of: ${validSources.join(", ")} (record ${i})`,
          code: "INVALID_VALUE",
        });
      }

      // Validate fetchedAt
      const fetchedAtError = validateRequired(record.fetchedAt, "fetchedAt", i);
      if (fetchedAtError) {
        errors.push({
          recordIndex: i,
          field: "fetchedAt",
          message: fetchedAtError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const fetchedAtFormatError = validateISODate(
          record.fetchedAt,
          "fetchedAt",
          i,
        );
        if (fetchedAtFormatError) {
          errors.push({
            recordIndex: i,
            field: "fetchedAt",
            message: fetchedAtFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate priority
      const priorityError = validateRequired(record.priority, "priority", i);
      if (priorityError) {
        errors.push({
          recordIndex: i,
          field: "priority",
          message: priorityError,
          code: "REQUIRED_FIELD",
        });
      } else if (typeof record.priority !== "number") {
        errors.push({
          recordIndex: i,
          field: "priority",
          message: `priority must be a number (record ${i})`,
          code: "INVALID_TYPE",
        });
      } else if (record.priority < 0 || record.priority > 100) {
        errors.push({
          recordIndex: i,
          field: "priority",
          message: `priority must be between 0 and 100 (record ${i})`,
          code: "INVALID_VALUE",
        });
      }

      // Validate metadata (nullable, but if present must be valid JSON string)
      if (record.metadata !== null && record.metadata !== undefined) {
        if (typeof record.metadata !== "string") {
          errors.push({
            recordIndex: i,
            field: "metadata",
            message: `metadata must be a JSON string or null (record ${i})`,
            code: "INVALID_TYPE",
          });
        } else {
          try {
            JSON.parse(record.metadata);
          } catch {
            errors.push({
              recordIndex: i,
              field: "metadata",
              message: `metadata must be valid JSON (record ${i})`,
              code: "INVALID_FORMAT",
            });
          }
        }
      }

      // Validate isArchived
      if (typeof record.isArchived !== "boolean") {
        errors.push({
          recordIndex: i,
          field: "isArchived",
          message: `isArchived must be a boolean (record ${i})`,
          code: "INVALID_TYPE",
        });
      }

      // Validate createdAt
      const createdAtError = validateRequired(record.createdAt, "createdAt", i);
      if (createdAtError) {
        errors.push({
          recordIndex: i,
          field: "createdAt",
          message: createdAtError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const createdAtFormatError = validateISODate(
          record.createdAt,
          "createdAt",
          i,
        );
        if (createdAtFormatError) {
          errors.push({
            recordIndex: i,
            field: "createdAt",
            message: createdAtFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate updatedAt
      const updatedAtError = validateRequired(record.updatedAt, "updatedAt", i);
      if (updatedAtError) {
        errors.push({
          recordIndex: i,
          field: "updatedAt",
          message: updatedAtError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const updatedAtFormatError = validateISODate(
          record.updatedAt,
          "updatedAt",
          i,
        );
        if (updatedAtFormatError) {
          errors.push({
            recordIndex: i,
            field: "updatedAt",
            message: updatedAtFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }
    }

    return errors;
  },
};
