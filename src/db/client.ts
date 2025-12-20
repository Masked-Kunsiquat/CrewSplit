/**
 * DATABASE - SQLite Client
 * LOCAL DATA ENGINEER: Database connection and migrations bootstrap
 */

import { useEffect, useRef, useState } from "react";
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
 * Defensive schema guard that ensures critical columns exist.
 * This handles edge cases where migrations may have been marked as applied
 * but didn't actually run (e.g., during app upgrades with existing databases).
 *
 * IMPORTANT: Only adds missing columns with safe defaults - never modifies existing data.
 */
const ensureSchemaIntegrity = async (): Promise<void> => {
  try {
    // Check if onboarding columns exist in trips table
    const tableInfo = expoDb.getAllSync(
      "PRAGMA table_info(trips)",
    ) as Array<{ name: string }>;
    const columnNames = new Set(tableInfo.map((col) => col.name));

    const missingColumns: string[] = [];
    if (!columnNames.has("is_sample_data")) {
      missingColumns.push("is_sample_data");
    }
    if (!columnNames.has("sample_data_template_id")) {
      missingColumns.push("sample_data_template_id");
    }
    if (!columnNames.has("is_archived")) {
      missingColumns.push("is_archived");
    }

    if (missingColumns.length > 0) {
      migrationLogger.warn(
        `Detected missing columns in trips table: ${missingColumns.join(", ")}. Applying defensive schema fixes.`,
      );

      // Apply the missing column additions from migration 0006
      if (missingColumns.includes("is_sample_data")) {
        expoDb.execSync(
          "ALTER TABLE trips ADD COLUMN is_sample_data INTEGER DEFAULT 0 NOT NULL",
        );
      }
      if (missingColumns.includes("sample_data_template_id")) {
        expoDb.execSync(
          "ALTER TABLE trips ADD COLUMN sample_data_template_id TEXT",
        );
      }
      if (missingColumns.includes("is_archived")) {
        expoDb.execSync(
          "ALTER TABLE trips ADD COLUMN is_archived INTEGER DEFAULT 0 NOT NULL",
        );
      }

      // Create indexes if they don't exist (safe - IF NOT EXISTS)
      expoDb.execSync(
        "CREATE INDEX IF NOT EXISTS idx_trips_sample_data ON trips (is_sample_data, is_archived)",
      );
      expoDb.execSync(
        "CREATE INDEX IF NOT EXISTS idx_trips_archived ON trips (is_archived)",
      );

      migrationLogger.info(
        "Schema integrity restored - missing columns added successfully",
      );
    }

    // Ensure user_settings and onboarding_state tables exist
    const tables = expoDb.getAllSync(
      "SELECT name FROM sqlite_master WHERE type='table'",
    ) as Array<{ name: string }>;
    const tableSet = new Set(tables.map((t) => t.name));

    if (!tableSet.has("user_settings")) {
      migrationLogger.warn(
        "Missing user_settings table - applying schema from migration 0006",
      );
      expoDb.execSync(`
        CREATE TABLE user_settings (
          id TEXT PRIMARY KEY DEFAULT 'default' NOT NULL,
          primary_user_name TEXT,
          default_currency TEXT DEFAULT 'USD' NOT NULL,
          created_at TEXT DEFAULT (datetime('now')) NOT NULL,
          updated_at TEXT DEFAULT (datetime('now')) NOT NULL
        )
      `);
      expoDb.execSync(
        "INSERT INTO user_settings (id) VALUES ('default') ON CONFLICT DO NOTHING",
      );
    }

    if (!tableSet.has("onboarding_state")) {
      migrationLogger.warn(
        "Missing onboarding_state table - applying schema from migration 0006",
      );
      expoDb.execSync(`
        CREATE TABLE onboarding_state (
          id TEXT PRIMARY KEY NOT NULL,
          is_completed INTEGER DEFAULT 0 NOT NULL,
          completed_steps TEXT DEFAULT '[]' NOT NULL,
          metadata TEXT DEFAULT '{}' NOT NULL,
          created_at TEXT DEFAULT (datetime('now')) NOT NULL,
          updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
          completed_at TEXT
        )
      `);
    }
  } catch (err) {
    migrationLogger.error("Schema integrity check failed", err);
    throw new Error(
      `Schema integrity check failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

/**
 * React hook to run pending migrations.
 * Blocks UI until all migrations succeed.
 *
 * Migration strategy:
 * - Drizzle tracks applied migrations in __drizzle_migrations table
 * - Only new migrations are applied (idempotent)
 * - Failures surface to _layout.tsx for user-visible error
 * - Never auto-wipe data - rely on proper migration files
 * - Defensive schema guard ensures critical columns exist even if migrations were skipped
 */
export const useDbMigrations = () => {
  const { success, error } = useMigrations(db, migrations);
  const loggedSuccess = useRef(false);
  const loggedError = useRef<string | null>(null);
  const [schemaChecked, setSchemaChecked] = useState(false);
  const [schemaError, setSchemaError] = useState<Error | null>(null);

  // Run defensive schema integrity check after Drizzle migrations succeed
  useEffect(() => {
    if (success && !schemaChecked) {
      ensureSchemaIntegrity()
        .then(() => {
          setSchemaChecked(true);
          migrationLogger.info("Schema integrity verified");
        })
        .catch((err) => {
          setSchemaError(
            err instanceof Error ? err : new Error(String(err)),
          );
        });
    }
  }, [success, schemaChecked]);

  useEffect(() => {
    if (success && schemaChecked && !loggedSuccess.current) {
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
  }, [success, schemaChecked, error]);

  return {
    success: success && schemaChecked,
    error: error || schemaError,
  };
};
