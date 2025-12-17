/**
 * DATABASE - Development Utilities
 * LOCAL DATA ENGINEER: DEVELOPMENT ONLY - Never import in production code
 *
 * DANGER: These utilities destroy user data.
 * Only use during local development when you need to reset your database.
 */

import { deleteDatabaseSync } from "expo-sqlite";

/**
 * DEVELOPMENT ONLY: Deletes the entire database
 *
 * Use cases:
 * - Testing migrations from scratch
 * - Clearing corrupt data during development
 * - Resetting to clean state after breaking changes
 *
 * NEVER call this in production code or ship it in a release build
 *
 * @example
 * // Add temporarily to src/db/client.ts for testing
 * import { resetDatabase } from './dev-utils';
 * if (__DEV__) {
 *   resetDatabase();
 * }
 */
export function resetDatabase(): void {
  if (!__DEV__) {
    throw new Error("resetDatabase() can only be called in development mode");
  }

  try {
    deleteDatabaseSync("crewsplit.db");
    console.warn(
      "🗑️  DEV: Database deleted - app will recreate on next launch",
    );
  } catch {
    console.log("No existing database to delete");
  }
}

/**
 * DEVELOPMENT ONLY: Check if migrations table exists
 *
 * Useful for debugging migration state without resetting
 */
export function logMigrationInfo(db: any): void {
  if (!__DEV__) {
    throw new Error(
      "logMigrationInfo() can only be called in development mode",
    );
  }

  try {
    const result = db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'`,
    );

    if (result) {
      const migrations = db.all(
        `SELECT * FROM __drizzle_migrations ORDER BY created_at`,
      );
      console.log("📊 Applied migrations:", migrations);
    } else {
      console.log("📊 No migrations table found - database is fresh");
    }
  } catch (error) {
    console.error("Failed to read migration info:", error);
  }
}
