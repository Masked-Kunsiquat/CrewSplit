/**
 * DATABASE MAPPERS - ExpenseSplit
 * LOCAL DATA ENGINEER: Convert between DB rows and domain models
 */

import type { ExpenseSplit, NewExpenseSplit } from "../schema/expense-splits";

/**
 * Domain model for ExpenseSplit (currently identical to DB model)
 * Future: Add computed split amounts or normalized shares here
 */
export interface ExpenseSplitDomain extends ExpenseSplit {
  // Helper methods can be added here in the future
}

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
