/**
 * TRIP EXPORT - Types
 * LOCAL DATA ENGINEER: Deterministic JSON export schema for trip-scoped data
 */

import type {
  Trip as TripRow,
  Participant as ParticipantRow,
  Expense as ExpenseRow,
} from "@db/schema";
import type { ExpenseSplit as ExpenseSplitRow } from "@db/schema/expense-splits";
import type { ExpenseCategory as ExpenseCategoryRow } from "@db/schema/expense-categories";

export type TripExportDomain = "participants" | "expenses" | "categories";

export type TripExportOptions = Readonly<{
  participants: boolean;
  expenses: boolean;
  categories: boolean;
}>;

export const defaultTripExportOptions: TripExportOptions = {
  participants: true,
  expenses: true,
  categories: true,
};

export type TripExportMetaV1 = Readonly<{
  format: "crewledger.trip-export";
  version: 1;
  exportedAt: string; // ISO timestamp
  app?: Readonly<{
    name?: string;
    version?: string;
  }>;
}>;

export type TripExportV1 = Readonly<{
  meta: TripExportMetaV1;
  trip: TripRow;
  participants?: ParticipantRow[];
  expenses?: ExpenseRow[];
  expenseSplits?: ExpenseSplitRow[];
  categories?: ExpenseCategoryRow[];
}>;

