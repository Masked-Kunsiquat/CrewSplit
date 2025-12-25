/**
 * LOCAL DATA ENGINEER: Settlement entity export/import logic
 */

import { db } from "@db/client";
import {
  settlements as settlementsTable,
  Settlement,
} from "@db/schema/settlements";
import { trips as tripsTable } from "@db/schema/trips";
import { participants as participantsTable } from "@db/schema/participants";
import { expenseSplits as expenseSplitsTable } from "@db/schema/expense-splits";
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

export const settlementEntity: ExportableEntity<Settlement> = {
  name: "settlements",
  dependencies: ["trips", "participants", "expenseSplits"],
  scope: "trip", // Settlements are trip-scoped

  async export(context: ExportContext): Promise<Settlement[]> {
    // Build query with filters
    const conditions = [];

    // Single trip scope - filter by tripId
    if (context.scope === "single_trip" && context.tripId) {
      conditions.push(eq(settlementsTable.tripId, context.tripId));
    }

    // For full_database: no additional filters (get all settlements)
    // For global_data: return empty array (settlements are not global)
    if (context.scope === "global_data") {
      return [];
    }

    // Execute query
    let query = db.select().from(settlementsTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const rows = await query;

    // Sort by ID for deterministic export
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  },

  async import(
    records: Settlement[],
    context: ImportContext,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      entityName: "settlements",
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
      const participantIds = [
        ...new Set([
          ...records.map((r) => r.fromParticipantId),
          ...records.map((r) => r.toParticipantId),
        ]),
      ];
      const expenseSplitIds = [
        ...new Set(
          records.map((r) => r.expenseSplitId).filter((id) => id !== null),
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

      // Check expense splits (only if there are non-null expenseSplitIds)
      let existingExpenseSplitIdSet = new Set<string>();
      if (expenseSplitIds.length > 0) {
        const existingExpenseSplits = await dbClient
          .select({ id: expenseSplitsTable.id })
          .from(expenseSplitsTable)
          .where(inArray(expenseSplitsTable.id, expenseSplitIds as string[]));
        existingExpenseSplitIdSet = new Set(
          existingExpenseSplits.map((es) => es.id),
        );
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

        if (!existingParticipantIdSet.has(record.fromParticipantId)) {
          result.errorCount++;
          result.errors.push({
            recordId: record.id,
            recordIndex: i,
            field: "fromParticipantId",
            message: `Foreign key violation: participant '${record.fromParticipantId}' not found`,
            code: "MISSING_FK",
          });
        }

        if (!existingParticipantIdSet.has(record.toParticipantId)) {
          result.errorCount++;
          result.errors.push({
            recordId: record.id,
            recordIndex: i,
            field: "toParticipantId",
            message: `Foreign key violation: participant '${record.toParticipantId}' not found`,
            code: "MISSING_FK",
          });
        }

        // Check expenseSplitId (only if present)
        if (
          record.expenseSplitId &&
          !existingExpenseSplitIdSet.has(record.expenseSplitId)
        ) {
          result.errorCount++;
          result.errors.push({
            recordId: record.id,
            recordIndex: i,
            field: "expenseSplitId",
            message: `Foreign key violation: expense split '${record.expenseSplitId}' not found`,
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
          .from(settlementsTable)
          .where(eq(settlementsTable.id, record.id))
          .limit(1);

        if (existing.length > 0) {
          // Handle conflict based on strategy
          if (context.conflictResolution === "skip") {
            result.skippedCount++;
            continue;
          } else if (context.conflictResolution === "replace") {
            // Update existing record
            await dbClient
              .update(settlementsTable)
              .set({
                tripId: record.tripId,
                fromParticipantId: record.fromParticipantId,
                toParticipantId: record.toParticipantId,
                expenseSplitId: record.expenseSplitId,
                originalCurrency: record.originalCurrency,
                originalAmountMinor: record.originalAmountMinor,
                fxRateToTrip: record.fxRateToTrip,
                convertedAmountMinor: record.convertedAmountMinor,
                date: record.date,
                description: record.description,
                paymentMethod: record.paymentMethod,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(settlementsTable.id, record.id));

            result.successCount++;
          } else if (context.conflictResolution === "generate_new_ids") {
            const error = new Error(
              `Conflict resolution strategy 'generate_new_ids' is not yet implemented for entity 'settlements'`,
            ) as Error & { code: string };
            error.code = "NOT_IMPLEMENTED";
            throw error;
          }
        } else {
          // No conflict - insert new record
          await dbClient.insert(settlementsTable).values(record);
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

  validate(records: Settlement[]): ValidationError[] {
    const errors: ValidationError[] = [];

    const validPaymentMethods = [
      "cash",
      "venmo",
      "paypal",
      "bank_transfer",
      "other",
    ];

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

      // Validate fromParticipantId
      const fromParticipantIdError = validateRequired(
        record.fromParticipantId,
        "fromParticipantId",
        i,
      );
      if (fromParticipantIdError) {
        errors.push({
          recordIndex: i,
          field: "fromParticipantId",
          message: fromParticipantIdError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const fromParticipantIdFormatError = validateUUID(
          record.fromParticipantId,
          "fromParticipantId",
          i,
        );
        if (fromParticipantIdFormatError) {
          errors.push({
            recordIndex: i,
            field: "fromParticipantId",
            message: fromParticipantIdFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate toParticipantId
      const toParticipantIdError = validateRequired(
        record.toParticipantId,
        "toParticipantId",
        i,
      );
      if (toParticipantIdError) {
        errors.push({
          recordIndex: i,
          field: "toParticipantId",
          message: toParticipantIdError,
          code: "REQUIRED_FIELD",
        });
      } else {
        const toParticipantIdFormatError = validateUUID(
          record.toParticipantId,
          "toParticipantId",
          i,
        );
        if (toParticipantIdFormatError) {
          errors.push({
            recordIndex: i,
            field: "toParticipantId",
            message: toParticipantIdFormatError,
            code: "INVALID_FORMAT",
          });
        }
      }

      // Validate that fromParticipantId and toParticipantId are different
      if (record.fromParticipantId === record.toParticipantId) {
        errors.push({
          recordIndex: i,
          field: "toParticipantId",
          message: `fromParticipantId and toParticipantId must be different (record ${i})`,
          code: "INVALID_VALUE",
        });
      }

      // Validate expenseSplitId (nullable)
      if (record.expenseSplitId) {
        const expenseSplitIdFormatError = validateUUID(
          record.expenseSplitId,
          "expenseSplitId",
          i,
        );
        if (expenseSplitIdFormatError) {
          errors.push({
            recordIndex: i,
            field: "expenseSplitId",
            message: expenseSplitIdFormatError,
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
      } else if (record.originalAmountMinor <= 0) {
        errors.push({
          recordIndex: i,
          field: "originalAmountMinor",
          message: `originalAmountMinor must be positive (record ${i})`,
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
      } else if (record.convertedAmountMinor <= 0) {
        errors.push({
          recordIndex: i,
          field: "convertedAmountMinor",
          message: `convertedAmountMinor must be positive (record ${i})`,
          code: "INVALID_VALUE",
        });
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

      // Validate paymentMethod (nullable, but must be valid if present)
      if (record.paymentMethod !== null && record.paymentMethod !== undefined) {
        if (!validPaymentMethods.includes(record.paymentMethod)) {
          errors.push({
            recordIndex: i,
            field: "paymentMethod",
            message: `paymentMethod must be one of: ${validPaymentMethods.join(", ")} or null (record ${i})`,
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
