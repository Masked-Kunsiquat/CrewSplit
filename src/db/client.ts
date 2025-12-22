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
 * Seed system expense categories if they don't exist
 * Drizzle migrations only run DDL, so we seed data programmatically
 */
const seedSystemCategories = async (): Promise<void> => {
  const { expenseCategories } = schema;

  const systemCategories = [
    {
      id: "cat-travel",
      name: "Travel & Transportation",
      emoji: "✈️",
      sortOrder: 100,
    },
    { id: "cat-food", name: "Food & Drinks", emoji: "🍔", sortOrder: 200 },
    {
      id: "cat-leisure",
      name: "Leisure & Entertainment",
      emoji: "🎭",
      sortOrder: 300,
    },
    { id: "cat-lodging", name: "Lodging", emoji: "🏨", sortOrder: 400 },
    { id: "cat-groceries", name: "Groceries", emoji: "🛒", sortOrder: 500 },
    { id: "cat-insurance", name: "Insurance", emoji: "🛡️", sortOrder: 600 },
    { id: "cat-shopping", name: "Shopping", emoji: "🛍️", sortOrder: 700 },
    { id: "cat-other", name: "Other", emoji: "📌", sortOrder: 999 },
  ];

  const now = new Date().toISOString();

  for (const cat of systemCategories) {
    try {
      await db.insert(expenseCategories).values({
        id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        tripId: null,
        isSystem: true,
        sortOrder: cat.sortOrder,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });
      migrationLogger.debug(`Seeded category: ${cat.id}`);
    } catch (err) {
      // Ignore if category already exists (primary key conflict)
      if (
        err instanceof Error &&
        err.message.includes("UNIQUE constraint failed")
      ) {
        migrationLogger.debug(`Category ${cat.id} already exists, skipping`);
      } else {
        throw err;
      }
    }
  }

  migrationLogger.info("System categories seeded successfully");
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
 * - After migrations, seed system categories programmatically (Drizzle only runs DDL)
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
  const [categoriesSeeded, setCategoriesSeeded] = useState(false);

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

  // Seed system categories after migrations are verified
  useEffect(() => {
    if (success && migrationVerified && !categoriesSeeded) {
      seedSystemCategories()
        .then(() => {
          setCategoriesSeeded(true);
        })
        .catch((err) => {
          migrationLogger.error("Failed to seed system categories", err);
          setMigrationStateError(
            err instanceof Error ? err : new Error(String(err)),
          );
        });
    }
  }, [success, migrationVerified, categoriesSeeded]);

  useEffect(() => {
    if (
      success &&
      migrationVerified &&
      categoriesSeeded &&
      !loggedSuccess.current
    ) {
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
  }, [success, migrationVerified, categoriesSeeded, error]);

  return {
    success: success && migrationVerified && categoriesSeeded,
    error: error || migrationStateError,
  };
};
