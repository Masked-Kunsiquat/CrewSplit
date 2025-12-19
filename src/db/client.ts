/**
 * DATABASE - SQLite Client
 * LOCAL DATA ENGINEER: Database connection and migrations bootstrap
 */

import { useEffect, useRef } from "react";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";
import migrations from "./migrations/migrations";
import * as schema from "./schema";
import { migrationLogger } from "@utils/logger";

// Open SQLite database
const expoDb = openDatabaseSync("crewsplit.db");

// CRITICAL: Enable foreign keys immediately after opening connection
// This must happen before any queries to ensure FK constraints are enforced
expoDb.execSync("PRAGMA foreign_keys = ON");

// Create Drizzle instance with schema
export const db = drizzle(expoDb, { schema });

/**
 * React hook to run pending migrations.
 * Blocks UI until all migrations succeed.
 *
 * Migration strategy:
 * - Drizzle tracks applied migrations in __drizzle_migrations table
 * - Only new migrations are applied (idempotent)
 * - Failures surface to _layout.tsx for user-visible error
 * - Never auto-wipe data - rely on proper migration files
 */
export const useDbMigrations = () => {
  const { success, error } = useMigrations(db, migrations);
  const loggedSuccess = useRef(false);
  const loggedError = useRef<string | null>(null);

  useEffect(() => {
    if (success && !loggedSuccess.current) {
      migrationLogger.info("Database migrations applied successfully");
      loggedSuccess.current = true;
    }

    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (loggedError.current !== message) {
        migrationLogger.error("Migration failed", error);
        loggedError.current = message;
      }
    }
  }, [success, error]);

  return { success, error };
};
