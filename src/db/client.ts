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

const migrationsTable = "__drizzle_migrations";

type MigrationEntry = (typeof migrations.journal.entries)[number];

const readAppliedMigrations = (): number[] => {
  const table = expoDb.getAllSync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    [migrationsTable],
  ) as { name: string }[];

  if (table.length === 0) {
    return [];
  }

  const rows = expoDb.getAllSync(
    `SELECT created_at FROM ${migrationsTable} ORDER BY id`,
  ) as { created_at: number | string }[];

  return rows
    .map((row) => Number(row.created_at))
    .filter((value) => Number.isFinite(value));
};

const buildMigrationIssues = (
  applied: number[],
  expected: MigrationEntry[],
): string[] => {
  const issues: string[] = [];
  const expectedTimes = expected.map((entry) => entry.when);
  const expectedTagsByTime = new Map(
    expected.map((entry) => [entry.when, entry.tag] as const),
  );
  const appliedSet = new Set(applied);

  if (expected.length === 0) {
    return issues;
  }

  if (applied.length === 0) {
    issues.push(
      `No rows found in ${migrationsTable} after migrations completed`,
    );
    return issues;
  }

  const unknown = applied.filter((time) => !expectedTagsByTime.has(time));
  if (unknown.length > 0) {
    issues.push(`Unknown migration timestamps recorded: ${unknown.join(", ")}`);
  }

  const expectedPrefix = expectedTimes.slice(0, applied.length);
  const prefixMismatch = expectedPrefix.some(
    (time, index) => time !== applied[index],
  );
  if (prefixMismatch) {
    const appliedTags = applied.map(
      (time) => expectedTagsByTime.get(time) ?? `unknown(${time})`,
    );
    issues.push(
      `Applied migrations are out of order: ${appliedTags.join(" -> ")}`,
    );
  }

  const maxApplied = Math.max(...applied);
  const missingBeforeLatest = expected
    .filter((entry) => entry.when <= maxApplied && !appliedSet.has(entry.when))
    .map((entry) => entry.tag);

  if (missingBeforeLatest.length > 0) {
    issues.push(
      `Skipped migrations before latest applied: ${missingBeforeLatest.join(
        ", ",
      )}`,
    );
  }

  if (applied.length !== expected.length) {
    issues.push(
      `Applied migration count (${applied.length}) does not match expected (${expected.length})`,
    );
  }

  return issues;
};

const verifyMigrationState = (): void => {
  const applied = readAppliedMigrations();
  const expected = migrations.journal.entries;
  const issues = buildMigrationIssues(applied, expected);

  if (issues.length === 0) {
    return;
  }

  migrationLogger.error("Migration history mismatch detected", {
    issues,
    applied,
    expected: expected.map((entry) => entry.tag),
  });

  throw new Error(
    `Migration history mismatch detected: ${issues.join(
      "; ",
    )}. This database requires a recovery migration or clean rebuild.`,
  );
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
 * - Migration history is verified against __drizzle_migrations after Drizzle completes
 */
export const useDbMigrations = () => {
  const { success, error } = useMigrations(db, migrations);
  const loggedSuccess = useRef(false);
  const loggedError = useRef<string | null>(null);
  const [migrationChecked, setMigrationChecked] = useState(false);
  const [migrationVerified, setMigrationVerified] = useState(false);
  const [migrationStateError, setMigrationStateError] = useState<Error | null>(
    null,
  );

  // Verify migration ordering/state after Drizzle migrations succeed.
  useEffect(() => {
    if (success && !migrationChecked) {
      try {
        verifyMigrationState();
        setMigrationVerified(true);
        migrationLogger.info("Migration history verified");
      } catch (err) {
        setMigrationStateError(
          err instanceof Error ? err : new Error(String(err)),
        );
      } finally {
        setMigrationChecked(true);
      }
    }
  }, [success, migrationChecked]);

  useEffect(() => {
    if (success && migrationVerified && !loggedSuccess.current) {
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
  }, [success, migrationVerified, error]);

  return {
    success: success && migrationVerified,
    error: error || migrationStateError,
  };
};
