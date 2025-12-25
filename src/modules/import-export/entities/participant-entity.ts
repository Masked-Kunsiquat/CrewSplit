/**
 * LOCAL DATA ENGINEER: Participant entity export/import logic
 */

import { db } from "@db/client";
import {
  participants as participantsTable,
  Participant,
  NewParticipant,
} from "@db/schema/participants";
import { trips as tripsTable } from "@db/schema/trips";
import { eq, and, inArray } from "drizzle-orm";
import {
  ExportableEntity,
  ExportContext,
  ImportContext,
  ImportResult,
  ValidationError,
} from "../core/types";
import { validateRequired, validateUUID, validateISODate } from "../core/validators";

export const participantEntity: ExportableEntity<Participant> = {
  name: "participants",
  dependencies: ["trips"], // Must export trips first
  scope: "trip", // Participants are trip-scoped

  async export(context: ExportContext): Promise<Participant[]> {
    // Build query with filters
    const conditions = [];

    // Single trip scope - filter by tripId
    if (context.scope === "single_trip" && context.tripId) {
      conditions.push(eq(participantsTable.tripId, context.tripId));
    }

    // For full_database: no additional filters (get all participants)
    // For global_data: return empty array (participants are not global)
    if (context.scope === "global_data") {
      return [];
    }

    // Execute query
    let query = db.select().from(participantsTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const rows = await query;

    // Sort by ID for deterministic export
    return rows.sort((a, b) => a.id.localeCompare(b.id));
  },

  async import(
    records: Participant[],
    context: ImportContext,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      entityName: "participants",
      totalRecords: records.length,
      successCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
    };

    if (context.dryRun) {
      return result; // Validation only
    }

    // Validate foreign key references if enabled
    if (context.validateForeignKeys) {
      const tripIds = [...new Set(records.map((r) => r.tripId))];
      const existingTrips = await db
        .select({ id: tripsTable.id })
        .from(tripsTable)
        .where(inArray(tripsTable.id, tripIds));

      const existingTripIdSet = new Set(existingTrips.map((t) => t.id));

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
        const existing = await db
          .select()
          .from(participantsTable)
          .where(eq(participantsTable.id, record.id))
          .limit(1);

        if (existing.length > 0) {
          // Handle conflict based on strategy
          if (context.conflictResolution === "skip") {
            result.skippedCount++;
            continue;
          } else if (context.conflictResolution === "replace") {
            // Update existing record
            await db
              .update(participantsTable)
              .set({
                tripId: record.tripId,
                name: record.name,
                avatarColor: record.avatarColor,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(participantsTable.id, record.id));

            result.successCount++;
          } else if (context.conflictResolution === "generate_new_ids") {
            result.errors.push({
              recordId: record.id,
              recordIndex: i,
              message:
                "generate_new_ids strategy not yet implemented for participants",
              code: "NOT_IMPLEMENTED",
            });
            result.errorCount++;
            continue;
          }
        } else {
          // No conflict - insert new record
          await db.insert(participantsTable).values(record);
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

  validate(records: Participant[]): ValidationError[] {
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
