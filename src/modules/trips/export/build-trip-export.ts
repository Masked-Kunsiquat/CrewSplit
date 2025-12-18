/**
 * TRIP EXPORT - DB Builder
 * LOCAL DATA ENGINEER: Fetches trip-scoped records and delegates to pure export creator.
 */

import { db } from "@db/client";
import {
  expenseCategories,
  expenseSplits,
  expenses,
  participants,
  trips,
} from "@db/schema";
import { asc, eq, inArray, or } from "drizzle-orm";
import { createTripExportV1 } from "./create-trip-export";
import {
  defaultTripExportOptions,
  TripExportOptions,
  TripExportMetaV1,
  TripExportV1,
} from "./types";

export async function buildTripExportV1FromDb(
  tripId: string,
  rawOptions?: Partial<TripExportOptions>,
  meta?: Omit<TripExportMetaV1, "format" | "version">,
): Promise<TripExportV1> {
  const options: TripExportOptions = {
    ...defaultTripExportOptions,
    ...rawOptions,
  };

  const tripRows = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  const trip = tripRows[0];
  if (!trip) throw new Error(`Trip not found for id ${tripId}`);

  const exportedAt = meta?.exportedAt ?? new Date().toISOString();
  const exportMeta: TripExportMetaV1 = {
    format: "crewledger.trip-export",
    version: 1,
    exportedAt,
    app: meta?.app,
  };

  const participantsRows = options.participants
    ? await db
        .select()
        .from(participants)
        .where(eq(participants.tripId, tripId))
        .orderBy(asc(participants.createdAt), asc(participants.id))
    : undefined;

  const expensesRows = options.expenses
    ? await db
        .select()
        .from(expenses)
        .where(eq(expenses.tripId, tripId))
        .orderBy(asc(expenses.date), asc(expenses.createdAt), asc(expenses.id))
    : undefined;

  const expenseIds = expensesRows?.map((e) => e.id) ?? [];

  const expenseSplitsRows =
    options.expenses && expenseIds.length
      ? await db
          .select()
          .from(expenseSplits)
          .where(inArray(expenseSplits.expenseId, expenseIds))
          .orderBy(
            asc(expenseSplits.expenseId),
            asc(expenseSplits.participantId),
            asc(expenseSplits.id),
          )
      : options.expenses
        ? []
        : undefined;

  const categoriesRows = await (async () => {
    if (!options.categories) return undefined;

    const categoryIds = Array.from(
      new Set(
        (expensesRows ?? [])
          .map((e) => e.categoryId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    if (!categoryIds.length) {
      return db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.tripId, tripId))
        .orderBy(
          asc(expenseCategories.sortOrder),
          asc(expenseCategories.name),
          asc(expenseCategories.id),
        );
    }

    return db
      .select()
      .from(expenseCategories)
      .where(
        or(
          inArray(expenseCategories.id, categoryIds),
          eq(expenseCategories.tripId, tripId),
        ),
      )
      .orderBy(
        asc(expenseCategories.sortOrder),
        asc(expenseCategories.name),
        asc(expenseCategories.id),
      );
  })();

  return createTripExportV1({
    meta: exportMeta,
    trip,
    participants: participantsRows,
    expenses: expensesRows,
    expenseSplits: expenseSplitsRows,
    categories: categoriesRows,
  });
}
