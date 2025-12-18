/**
 * TRIP EXPORT - Pure creator
 * LOCAL DATA ENGINEER: Deterministic assembly + sorting with zero DB/UI assumptions.
 */

import type {
  expenseCategories,
  expenseSplits,
  expenses,
  participants,
  trips,
} from "@db/schema";
import type { TripExportMetaV1, TripExportV1 } from "./types";

export type CreateTripExportInput = Readonly<{
  meta: TripExportMetaV1;
  trip: typeof trips.$inferSelect;
  participants?: typeof participants.$inferSelect[];
  expenses?: typeof expenses.$inferSelect[];
  expenseSplits?: typeof expenseSplits.$inferSelect[];
  categories?: typeof expenseCategories.$inferSelect[];
}>;

function compareStrings(a: string, b: string) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function createTripExportV1(input: CreateTripExportInput): TripExportV1 {
  const out: {
    meta: TripExportMetaV1;
    trip: typeof trips.$inferSelect;
    participants?: typeof participants.$inferSelect[];
    expenses?: typeof expenses.$inferSelect[];
    expenseSplits?: typeof expenseSplits.$inferSelect[];
    categories?: typeof expenseCategories.$inferSelect[];
  } = {
    meta: input.meta,
    trip: input.trip,
  };

  if (input.participants) {
    out.participants = [...input.participants].sort((a, b) => {
      return (
        compareStrings(a.createdAt, b.createdAt) || compareStrings(a.id, b.id)
      );
    });
  }

  if (input.expenses) {
    out.expenses = [...input.expenses].sort((a, b) => {
      return (
        compareStrings(a.date, b.date) ||
        compareStrings(a.createdAt, b.createdAt) ||
        compareStrings(a.id, b.id)
      );
    });
  }

  if (input.expenseSplits) {
    out.expenseSplits = [...input.expenseSplits].sort((a, b) => {
      return (
        compareStrings(a.expenseId, b.expenseId) ||
        compareStrings(a.participantId, b.participantId) ||
        compareStrings(a.id, b.id)
      );
    });
  }

  if (input.categories) {
    out.categories = [...input.categories].sort((a, b) => {
      return (
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        compareStrings(a.name, b.name) ||
        compareStrings(a.id, b.id)
      );
    });
  }

  return out;
}

