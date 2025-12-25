/**
 * LOCAL DATA ENGINEER: ExpenseSplit entity export/import logic
 */

import { db } from "@db/client";
import {
  expenseSplits as expenseSplitsTable,
  ExpenseSplit,
} from "@db/schema/expense-splits";
import { expenses as expensesTable } from "@db/schema/expenses";
import { participants as participantsTable } from "@db/schema/participants";
import { eq, inArray } from "drizzle-orm";
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

export const expenseSplitEntity: ExportableEntity<ExpenseSplit> = {
  name: "expenseSplits",
  dependencies: ["expenses", "participants"],
  scope: "trip", // Expense splits are trip-scoped (indirectly via expenses)

  async export(context: ExportContext): Promise<ExpenseSplit[]> {
    // For single_trip exports, need to filter by expenses that belong to the trip
    if (context.scope === "single_trip" && context.tripId) {
      // First, get all expense IDs for this trip
      const tripExpenses = await db
        .select({ id: expensesTable.id })
        .from(expensesTable)
        .where(eq(expensesTable.tripId, context.tripId));

      const expenseIds = tripExpenses.map((e) => e.id);

      if (expenseIds.length === 0) {
        return []; // No expenses, no splits
      }

      // Then get all expense splits for those expenses
      const splits = await db
        .select()
        .from(expenseSplitsTable)
        .where(inArray(expenseSplitsTable.expenseId, expenseIds));

      // Sort by ID for deterministic export
      return splits.sort((a, b) => a.id.localeCompare(b.id));
    }

    // For full_database: get all expense splits
    if (context.scope === "full_database") {
      const rows = await db.select().from(expenseSplitsTable);
      return rows.sort((a, b) => a.id.localeCompare(b.id));
    }

    // For global_data: return empty array (expense splits are not global)
    return [];
  },

  async import(
    records: ExpenseSplit[],
    context: ImportContext,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      entityName: "expenseSplits",
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
      const expenseIds = [...new Set(records.map((r) => r.expenseId))];
      const participantIds = [...new Set(records.map((r) => r.participantId))];

      // Check expenses
      const existingExpenses = await dbClient
        .select({ id: expensesTable.id })
        .from(expensesTable)
        .where(inArray(expensesTable.id, expenseIds));
      const existingExpenseIdSet = new Set(existingExpenses.map((e) => e.id));

      // Check participants
      const existingParticipants = await dbClient
        .select({ id: participantsTable.id })
        .from(participantsTable)
        .where(inArray(participantsTable.id, participantIds));
      const existingParticipantIdSet = new Set(
        existingParticipants.map((p) => p.id),
      );

      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        if (!existingExpenseIdSet.has(record.expenseId)) {
          result.errorCount++;
          result.errors.push({
            recordId: record.id,
            recordIndex: i,
            field: "expenseId",
            message: `Foreign key violation: expense '${record.expenseId}' not found`,
            code: "MISSING_FK",
          });
        }

        if (!existingParticipantIdSet.has(record.participantId)) {
          result.errorCount++;
          result.errors.push({
            recordId: record.id,
            recordIndex: i,
            field: "participantId",
            message: `Foreign key violation: participant '${record.participantId}' not found`,
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
          .from(expenseSplitsTable)
          .where(eq(expenseSplitsTable.id, record.id))
          .limit(1);

        if (existing.length > 0) {
          // Handle conflict based on strategy
          if (context.conflictResolution === "skip") {
            result.skippedCount++;
            continue;
          } else if (context.conflictResolution === "replace") {
            // Update existing record
            await dbClient
              .update(expenseSplitsTable)
              .set({
                expenseId: record.expenseId,
                participantId: record.participantId,
                share: record.share,
                shareType: record.shareType,
                amount: record.amount,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(expenseSplitsTable.id, record.id));

            result.successCount++;
          } else if (context.conflictResolution === "generate_new_ids") {
            const error = new Error(
              `Conflict resolution strategy 'generate_new_ids' is not yet implemented for entity 'expenseSplits'`,
            ) as Error & { code: string };
            error.code = "NOT_IMPLEMENTED";
            throw error;
          }
        } else {
          // No conflict - insert new record
          await dbClient.insert(expenseSplitsTable).values(record);
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

  validate(records: ExpenseSplit[]): ValidationError[] {
    const errors: ValidationError[] = [];

    const validShareTypes = ["equal", "percentage", "weight", "amount"];

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

      // Validate expenseId
      const expenseIdError = validateRequired(record.expenseId, "expenseId", i);
      if (expenseIdError) {
        errors.push({
          recordIndex: i,
          field: "expenseId",
          message: expenseIdError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const expenseIdFormatError = validateUUID(
          record.expenseId,
          "expenseId",
          i,
        );
        if (expenseIdFormatError) {
          errors.push({
            recordIndex: i,
            field: "expenseId",
            message: expenseIdFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate participantId
      const participantIdError = validateRequired(
        record.participantId,
        "participantId",
        i,
      );
      if (participantIdError) {
        errors.push({
          recordIndex: i,
          field: "participantId",
          message: participantIdError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const participantIdFormatError = validateUUID(
          record.participantId,
          "participantId",
          i,
        );
        if (participantIdFormatError) {
          errors.push({
            recordIndex: i,
            field: "participantId",
            message: participantIdFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate share
      const shareError = validateRequired(record.share, "share", i);
      if (shareError) {
        errors.push({
          recordIndex: i,
          field: "share",
          message: shareError,
          code: "REQUIRED_FIELD",
        });
      } else if (typeof record.share !== "number") {
        errors.push({
          recordIndex: i,
          field: "share",
          message: `share must be a number (record ${i})`,
          code: "INVALID_TYPE",
        });
      }

      // Validate shareType
      const shareTypeError = validateRequired(record.shareType, "shareType", i);
      if (shareTypeError) {
        errors.push({
          recordIndex: i,
          field: "shareType",
          message: shareTypeError,
          code: "REQUIRED_FIELD",
        });
      } else if (!validShareTypes.includes(record.shareType)) {
        errors.push({
          recordIndex: i,
          field: "shareType",
          message: `shareType must be one of: ${validShareTypes.join(", ")} (record ${i})`,
          code: "INVALID_VALUE",
        });
      }

      // Validate amount (nullable, but required for 'amount' shareType)
      if (record.shareType === "amount") {
        if (record.amount === null || record.amount === undefined) {
          errors.push({
            recordIndex: i,
            field: "amount",
            message: `amount is required for shareType 'amount' (record ${i})`,
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
      }

      // Validate percentage range for percentage shareType
      if (record.shareType === "percentage") {
        if (record.share < 0 || record.share > 100) {
          errors.push({
            recordIndex: i,
            field: "share",
            message: `share must be between 0 and 100 for percentage type (record ${i})`,
            code: "INVALID_VALUE",
          });
        }
      }

      // Validate weight is positive for weight shareType
      if (record.shareType === "weight") {
        if (record.share <= 0) {
          errors.push({
            recordIndex: i,
            field: "share",
            message: `share must be positive for weight type (record ${i})`,
            code: "INVALID_VALUE",
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
