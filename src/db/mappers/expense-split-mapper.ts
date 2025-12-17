/**
 * DATABASE MAPPERS - ExpenseSplit
 * LOCAL DATA ENGINEER: Convert between DB rows and domain models
 */

import type { ExpenseSplit } from "../schema/expense-splits";

/**
 * Domain model for ExpenseSplit (currently identical to DB model)
 * Future: Add computed split amounts or normalized shares here
 */
export type ExpenseSplitDomain = ExpenseSplit;

/**
 * Map ExpenseSplit database row to domain model
 */
export function mapExpenseSplitFromDb(
  record: ExpenseSplit,
): ExpenseSplitDomain {
  return {
    ...record,
  };
}

/**
 * Map array of ExpenseSplits from DB
 */
export function mapExpenseSplitsFromDb(
  records: ExpenseSplit[],
): ExpenseSplitDomain[] {
  return records.map(mapExpenseSplitFromDb);
}
