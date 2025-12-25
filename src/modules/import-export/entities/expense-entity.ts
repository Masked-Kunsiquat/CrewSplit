/**
 * LOCAL DATA ENGINEER: Expense entity export/import logic
 */

import { db } from "@db/client";
import { expenses as expensesTable, Expense } from "@db/schema/expenses";
import { trips as tripsTable } from "@db/schema/trips";
import { participants as participantsTable } from "@db/schema/participants";
import { expenseCategories as expenseCategoriesTable } from "@db/schema/expense-categories";
import { eq, and, inArray } from "drizzle-orm";
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

export const expenseEntity: ExportableEntity<Expense> = {
  name: "expenses",
  dependencies: ["trips", "participants", "expenseCategories"],
  scope: "trip", // Expenses are trip-scoped

  async export(context: ExportContext): Promise<Expense[]> {
    // Build query with filters
    const conditions = [];

    // Single trip scope - filter by tripId
    if (context.scope === "single_trip" && context.tripId) {
      conditions.push(eq(expensesTable.tripId, context.tripId));
    }

    // For full_database: no additional filters (get all expenses)
    // For global_data: return empty array (expenses are not global)
    if (context.scope === "global_data") {
      return [];
    }

    // Execute query
    let query = db.select().from(expensesTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const rows = await query;

    // Sort by ID for deterministic export
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  },

  async import(
    records: Expense[],
    context: ImportContext,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      entityName: "expenses",
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

    // Validate foreign key references if enabled
    if (context.validateForeignKeys) {
      const tripIds = [...new Set(records.map((r) => r.tripId))];
      const participantIds = [...new Set(records.map((r) => r.paidBy))];
      const categoryIds = [
        ...new Set(
          records
            .map((r) => r.categoryId)
            .filter((id): id is string => id !== null),
        ),
      ];

      // Check trips
      const existingTrips = await dbClient
        .select({ id: tripsTable.id })
        .from(tripsTable)
        .where(inArray(tripsTable.id, tripIds));
      const existingTripIdSet = new Set(existingTrips.map((t) => t.id));

      // Check participants
      const existingParticipants = await dbClient
        .select({ id: participantsTable.id })
        .from(participantsTable)
        .where(inArray(participantsTable.id, participantIds));
      const existingParticipantIdSet = new Set(
        existingParticipants.map((p) => p.id),
      );

      // Check categories (if any)
      let existingCategoryIdSet = new Set<string>();
      if (categoryIds.length > 0) {
        const existingCategories = await dbClient
          .select({ id: expenseCategoriesTable.id })
          .from(expenseCategoriesTable)
          .where(inArray(expenseCategoriesTable.id, categoryIds));
        existingCategoryIdSet = new Set(existingCategories.map((c) => c.id));
      }

      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        if (!existingTripIdSet.has(record.tripId)) {
          result.errorCount++;
          result.errors.push({
            recordId: record.id,
            recordIndex: i,
            field: "tripId",
            message: `Foreign key violation: trip '${record.tripId}' not found`,
            code: "MISSING_FK",
          });
        }

        if (!existingParticipantIdSet.has(record.paidBy)) {
          result.errorCount++;
          result.errors.push({
            recordId: record.id,
            recordIndex: i,
            field: "paidBy",
            message: `Foreign key violation: participant '${record.paidBy}' not found`,
            code: "MISSING_FK",
          });
        }

        if (
          record.categoryId &&
          !existingCategoryIdSet.has(record.categoryId)
        ) {
          result.errorCount++;
          result.errors.push({
            recordId: record.id,
            recordIndex: i,
            field: "categoryId",
            message: `Foreign key violation: category '${record.categoryId}' not found`,
            code: "MISSING_FK",
          });
        }
      }

      // If FK validation failed, return early
      if (result.errorCount > 0) {
        return result;
      }
    }

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        // Check for ID conflicts
        const existing = await dbClient
          .select()
          .from(expensesTable)
          .where(eq(expensesTable.id, record.id))
          .limit(1);

        if (existing.length > 0) {
          // Handle conflict based on strategy
          if (context.conflictResolution === "skip") {
            result.skippedCount++;
            continue;
          } else if (context.conflictResolution === "replace") {
            // Update existing record
            await dbClient
              .update(expensesTable)
              .set({
                tripId: record.tripId,
                description: record.description,
                notes: record.notes,
                amount: record.amount,
                currency: record.currency,
                originalCurrency: record.originalCurrency,
                originalAmountMinor: record.originalAmountMinor,
                fxRateToTrip: record.fxRateToTrip,
                convertedAmountMinor: record.convertedAmountMinor,
                paidBy: record.paidBy,
                categoryId: record.categoryId,
                category: record.category,
                date: record.date,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(expensesTable.id, record.id));

            result.successCount++;
          } else if (context.conflictResolution === "generate_new_ids") {
            const error = new Error(
              `Conflict resolution strategy 'generate_new_ids' is not yet implemented for entity 'expenses'`,
            ) as Error & { code: string };
            error.code = "NOT_IMPLEMENTED";
            throw error;
          }
        } else {
          // No conflict - insert new record
          await dbClient.insert(expensesTable).values(record);
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

  validate(records: Expense[]): ValidationError[] {
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

      // Validate tripId
      const tripIdError = validateRequired(record.tripId, "tripId", i);
      if (tripIdError) {
        errors.push({
          recordIndex: i,
          field: "tripId",
          message: tripIdError,
          code: "REQUIRED_FIELD",
        });
      } else {
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

      // Validate description
      const descriptionError = validateRequired(
        record.description,
        "description",
        i,
      );
      if (descriptionError) {
        errors.push({
          recordIndex: i,
          field: "description",
          message: descriptionError,
          code: "REQUIRED_FIELD",
        });
      }

      // Validate amount
      const amountError = validateRequired(record.amount, "amount", i);
      if (amountError) {
        errors.push({
          recordIndex: i,
          field: "amount",
          message: amountError,
          code: "REQUIRED_FIELD",
        });
      } else if (typeof record.amount !== "number") {
        errors.push({
          recordIndex: i,
          field: "amount",
          message: `amount must be a number (record ${i})`,
          code: "INVALID_TYPE",
        });
      } else if (record.amount < 0) {
        errors.push({
          recordIndex: i,
          field: "amount",
          message: `amount must be non-negative (record ${i})`,
          code: "INVALID_VALUE",
        });
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

      // Validate originalCurrency
      const originalCurrencyError = validateRequired(
        record.originalCurrency,
        "originalCurrency",
        i,
      );
      if (originalCurrencyError) {
        errors.push({
          recordIndex: i,
          field: "originalCurrency",
          message: originalCurrencyError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const originalCurrencyFormatError = validateCurrencyCode(
          record.originalCurrency,
          "originalCurrency",
          i,
        );
        if (originalCurrencyFormatError) {
          errors.push({
            recordIndex: i,
            field: "originalCurrency",
            message: originalCurrencyFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate originalAmountMinor
      const originalAmountMinorError = validateRequired(
        record.originalAmountMinor,
        "originalAmountMinor",
        i,
      );
      if (originalAmountMinorError) {
        errors.push({
          recordIndex: i,
          field: "originalAmountMinor",
          message: originalAmountMinorError,
          code: "REQUIRED_FIELD",
        });
      } else if (typeof record.originalAmountMinor !== "number") {
        errors.push({
          recordIndex: i,
          field: "originalAmountMinor",
          message: `originalAmountMinor must be a number (record ${i})`,
          code: "INVALID_TYPE",
        });
      } else if (record.originalAmountMinor < 0) {
        errors.push({
          recordIndex: i,
          field: "originalAmountMinor",
          message: `originalAmountMinor must be non-negative (record ${i})`,
          code: "INVALID_VALUE",
        });
      }

      // Validate fxRateToTrip (nullable)
      if (record.fxRateToTrip !== null && record.fxRateToTrip !== undefined) {
        if (typeof record.fxRateToTrip !== "number") {
          errors.push({
            recordIndex: i,
            field: "fxRateToTrip",
            message: `fxRateToTrip must be a number or null (record ${i})`,
            code: "INVALID_TYPE",
          });
        } else if (record.fxRateToTrip <= 0) {
          errors.push({
            recordIndex: i,
            field: "fxRateToTrip",
            message: `fxRateToTrip must be positive (record ${i})`,
            code: "INVALID_VALUE",
          });
        }
      }

      // Validate convertedAmountMinor
      const convertedAmountMinorError = validateRequired(
        record.convertedAmountMinor,
        "convertedAmountMinor",
        i,
      );
      if (convertedAmountMinorError) {
        errors.push({
          recordIndex: i,
          field: "convertedAmountMinor",
          message: convertedAmountMinorError,
          code: "REQUIRED_FIELD",
        });
      } else if (typeof record.convertedAmountMinor !== "number") {
        errors.push({
          recordIndex: i,
          field: "convertedAmountMinor",
          message: `convertedAmountMinor must be a number (record ${i})`,
          code: "INVALID_TYPE",
        });
      } else if (record.convertedAmountMinor < 0) {
        errors.push({
          recordIndex: i,
          field: "convertedAmountMinor",
          message: `convertedAmountMinor must be non-negative (record ${i})`,
          code: "INVALID_VALUE",
        });
      }

      // Validate paidBy
      const paidByError = validateRequired(record.paidBy, "paidBy", i);
      if (paidByError) {
        errors.push({
          recordIndex: i,
          field: "paidBy",
          message: paidByError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const paidByFormatError = validateUUID(record.paidBy, "paidBy", i);
        if (paidByFormatError) {
          errors.push({
            recordIndex: i,
            field: "paidBy",
            message: paidByFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate categoryId (nullable)
      if (record.categoryId) {
        const categoryIdFormatError = validateUUID(
          record.categoryId,
          "categoryId",
          i,
        );
        if (categoryIdFormatError) {
          errors.push({
            recordIndex: i,
            field: "categoryId",
            message: categoryIdFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate date
      const dateError = validateRequired(record.date, "date", i);
      if (dateError) {
        errors.push({
          recordIndex: i,
          field: "date",
          message: dateError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const dateFormatError = validateISODate(record.date, "date", i);
        if (dateFormatError) {
          errors.push({
            recordIndex: i,
            field: "date",
            message: dateFormatError,
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
