/**
 * LOCAL DATA ENGINEER: Trip entity export/import logic
 */

import { db } from "@db/client";
import { trips as tripsTable, Trip } from "@db/schema/trips";
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
  validateISODate,
  validateCurrencyCode,
  validateUUID,
} from "../core/validators";

export const tripEntity: ExportableEntity<Trip> = {
  name: "trips",
  dependencies: [], // Root entity - no dependencies
  scope: "both", // Can be exported globally or per-trip

  async export(context: ExportContext): Promise<Trip[]> {
    // Build query with filters
    const conditions = [];

    // Single trip scope
    if (context.scope === "single_trip" && context.tripId) {
      conditions.push(eq(tripsTable.id, context.tripId));
    }

    // Exclude sample data (unless explicitly included)
    if (!context.includeSampleData) {
      conditions.push(eq(tripsTable.isSampleData, false));
    }

    // Exclude archived data (unless explicitly included)
    if (!context.includeArchivedData) {
      conditions.push(eq(tripsTable.isArchived, false));
    }

    // Execute query
    let query = db.select().from(tripsTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const rows = await query;

    // Sort by ID for deterministic export
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  },

  async import(records: Trip[], context: ImportContext): Promise<ImportResult> {
    const result: ImportResult = {
      entityName: "trips",
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
          .from(tripsTable)
          .where(eq(tripsTable.id, record.id))
          .limit(1);

        if (existing.length > 0) {
          // Handle conflict based on strategy
          if (context.conflictResolution === "skip") {
            result.skippedCount++;
            continue;
          } else if (context.conflictResolution === "replace") {
            // Update existing record
            await dbClient
              .update(tripsTable)
              .set({
                name: record.name,
                description: record.description,
                startDate: record.startDate,
                endDate: record.endDate,
                currency: record.currency,
                currencyCode: record.currencyCode,
                emoji: record.emoji,
                isSampleData: record.isSampleData,
                sampleDataTemplateId: record.sampleDataTemplateId,
                isArchived: record.isArchived,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(tripsTable.id, record.id));

            result.successCount++;
          } else if (context.conflictResolution === "generate_new_ids") {
            result.errors.push({
              recordId: record.id,
              recordIndex: i,
              message:
                "generate_new_ids strategy not yet implemented for trips",
              code: "NOT_IMPLEMENTED",
            });
            result.errorCount++;
            continue;
          }
        } else {
          // No conflict - insert new record
          await dbClient.insert(tripsTable).values(record);
          result.successCount++;
        }
      } catch (error) {
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

  validate(records: Trip[]): ValidationError[] {
    const errors: ValidationError[] = [];

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

      // Validate name
      const nameError = validateRequired(record.name, "name", i);
      if (nameError) {
        errors.push({
          recordIndex: i,
          field: "name",
          message: nameError,
          code: "REQUIRED_FIELD",
        });
      }

      // Validate startDate
      const startDateError = validateRequired(record.startDate, "startDate", i);
      if (startDateError) {
        errors.push({
          recordIndex: i,
          field: "startDate",
          message: startDateError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const startDateFormatError = validateISODate(
          record.startDate,
          "startDate",
          i,
        );
        if (startDateFormatError) {
          errors.push({
            recordIndex: i,
            field: "startDate",
            message: startDateFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate endDate (if present)
      if (record.endDate) {
        const endDateError = validateISODate(record.endDate, "endDate", i);
        if (endDateError) {
          errors.push({
            recordIndex: i,
            field: "endDate",
            message: endDateError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate currency
      const currencyError = validateRequired(record.currency, "currency", i);
      if (currencyError) {
        errors.push({
          recordIndex: i,
          field: "currency",
          message: currencyError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const currencyFormatError = validateCurrencyCode(
          record.currency,
          "currency",
          i,
        );
        if (currencyFormatError) {
          errors.push({
            recordIndex: i,
            field: "currency",
            message: currencyFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate currencyCode
      const currencyCodeError = validateRequired(
        record.currencyCode,
        "currencyCode",
        i,
      );
      if (currencyCodeError) {
        errors.push({
          recordIndex: i,
          field: "currencyCode",
          message: currencyCodeError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const currencyCodeFormatError = validateCurrencyCode(
          record.currencyCode,
          "currencyCode",
          i,
        );
        if (currencyCodeFormatError) {
          errors.push({
            recordIndex: i,
            field: "currencyCode",
            message: currencyCodeFormatError,
            code: "INVALID_FORMAT",
          });
        }
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
