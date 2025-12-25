/**
 * LOCAL DATA ENGINEER: ExpenseCategory entity export/import logic
 */

import { db } from "@db/client";
import {
  expenseCategories as expenseCategoriesTable,
  ExpenseCategory,
} from "@db/schema/expense-categories";
import { eq, and, or, isNull } from "drizzle-orm";
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
} from "../core/validators";

export const expenseCategoryEntity: ExportableEntity<ExpenseCategory> = {
  name: "expenseCategories",
  dependencies: [], // Global data - no dependencies
  scope: "global", // Categories can be global or trip-specific

  async export(context: ExportContext): Promise<ExpenseCategory[]> {
    // Build query with filters
    const conditions = [];

    if (context.scope === "single_trip" && context.tripId) {
      // For single_trip exports: include BOTH global categories (tripId=null)
      // AND trip-specific categories (tripId=context.tripId)
      conditions.push(
        or(
          isNull(expenseCategoriesTable.tripId),
          eq(expenseCategoriesTable.tripId, context.tripId),
        ),
      );
    }

    // For full_database: no additional filters (get all categories)
    // For global_data: only global categories (tripId=null)
    if (context.scope === "global_data") {
      conditions.push(isNull(expenseCategoriesTable.tripId));
    }

    // Exclude archived data (unless explicitly included)
    if (!context.includeArchivedData) {
      conditions.push(eq(expenseCategoriesTable.isArchived, false));
    }

    // Execute query
    let query = db.select().from(expenseCategoriesTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const rows = await query;

    // Sort by ID for deterministic export
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  },

  async import(
    records: ExpenseCategory[],
    context: ImportContext,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      entityName: "expenseCategories",
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
          .from(expenseCategoriesTable)
          .where(eq(expenseCategoriesTable.id, record.id))
          .limit(1);

        if (existing.length > 0) {
          // System categories (isSystem=true) should NOT be overwritten
          // Skip them even with "replace" strategy
          if (existing[0].isSystem) {
            result.skippedCount++;
            continue;
          }

          // Handle conflict based on strategy
          if (context.conflictResolution === "skip") {
            result.skippedCount++;
            continue;
          } else if (context.conflictResolution === "replace") {
            // Update existing record (non-system categories only)
            await dbClient
              .update(expenseCategoriesTable)
              .set({
                name: record.name,
                emoji: record.emoji,
                tripId: record.tripId,
                isSystem: record.isSystem,
                sortOrder: record.sortOrder,
                isArchived: record.isArchived,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(expenseCategoriesTable.id, record.id));

            result.successCount++;
          } else if (context.conflictResolution === "generate_new_ids") {
            result.errors.push({
              recordId: record.id,
              recordIndex: i,
              message:
                "generate_new_ids strategy not yet implemented for expense categories",
              code: "NOT_IMPLEMENTED",
            });
            result.errorCount++;
            continue;
          }
        } else {
          // No conflict - insert new record
          await dbClient.insert(expenseCategoriesTable).values(record);
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

  validate(records: ExpenseCategory[]): ValidationError[] {
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

      // Validate emoji
      const emojiError = validateRequired(record.emoji, "emoji", i);
      if (emojiError) {
        errors.push({
          recordIndex: i,
          field: "emoji",
          message: emojiError,
          code: "REQUIRED_FIELD",
        });
      }

      // Validate tripId (if present)
      if (record.tripId) {
        const tripIdFormatError = validateUUID(record.tripId, "tripId", i);
        if (tripIdFormatError) {
          errors.push({
            recordIndex: i,
            field: "tripId",
            message: tripIdFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate isSystem
      if (typeof record.isSystem !== "boolean") {
        errors.push({
          recordIndex: i,
          field: "isSystem",
          message: `isSystem must be a boolean (record ${i})`,
          code: "INVALID_TYPE",
        });
      }

      // Validate sortOrder
      const sortOrderError = validateRequired(record.sortOrder, "sortOrder", i);
      if (sortOrderError) {
        errors.push({
          recordIndex: i,
          field: "sortOrder",
          message: sortOrderError,
          code: "REQUIRED_FIELD",
        });
      } else if (typeof record.sortOrder !== "number") {
        errors.push({
          recordIndex: i,
          field: "sortOrder",
          message: `sortOrder must be a number (record ${i})`,
          code: "INVALID_TYPE",
        });
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
