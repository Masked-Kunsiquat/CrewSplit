/**
 * DATABASE - SQLite Client
 * LOCAL DATA ENGINEER: Database connection and initialization
 */

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

// Increment when schema changes. Temporary: we reset the DB if version mismatches
// until a proper migration system (Phase 2) lands.
const SCHEMA_VERSION = 2;

// Open SQLite database
const expoDb = openDatabaseSync('crewsplit.db');

// CRITICAL: Enable foreign keys immediately after opening connection
// This must happen before any queries to ensure FK constraints are enforced
expoDb.execSync('PRAGMA foreign_keys = ON');

// Create Drizzle instance with schema
export const db = drizzle(expoDb, { schema });

/**
 * Initialize database schema
 * Creates all tables if they don't exist
 * Should be called on app startup before any queries
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    const result = await db.get<{ userVersion: number }>(sql`PRAGMA user_version`);
    const currentVersion = result?.userVersion ?? 0;

    // TEMP: Destructive reset for schema changes until migrations are implemented.
    // This avoids "no such column" crashes when multi-currency columns are missing.
    if (currentVersion !== SCHEMA_VERSION) {
      console.warn(
        `[DB] Schema version mismatch (found ${currentVersion}, expected ${SCHEMA_VERSION}); resetting local database.`,
      );
      await db.run(sql`DROP TABLE IF EXISTS expense_splits`);
      await db.run(sql`DROP TABLE IF EXISTS expenses`);
      await db.run(sql`DROP TABLE IF EXISTS participants`);
      await db.run(sql`DROP TABLE IF EXISTS trips`);
      await db.run(sql.raw(`PRAGMA user_version = ${Number.isInteger(SCHEMA_VERSION) ? SCHEMA_VERSION : 0}`));
    }

    // Foreign keys already enabled at module load (see above)

    // Create trips table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        currency TEXT NOT NULL DEFAULT 'USD', -- legacy alias
        currency_code TEXT NOT NULL DEFAULT 'USD', -- canonical ISO code
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create participants table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY NOT NULL,
        trip_id TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar_color TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      )
    `);

    // Create expenses table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        trip_id TEXT NOT NULL,
        description TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        original_currency TEXT NOT NULL,
        original_amount_minor INTEGER NOT NULL,
        fx_rate_to_trip REAL,
        converted_amount_minor INTEGER NOT NULL,
        paid_by TEXT NOT NULL,
        category TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        FOREIGN KEY (paid_by) REFERENCES participants(id) ON DELETE RESTRICT
      )
    `);

    // Create expense_splits table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS expense_splits (
        id TEXT PRIMARY KEY NOT NULL,
        expense_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        share REAL NOT NULL,
        share_type TEXT NOT NULL CHECK(share_type IN ('equal', 'percentage', 'weight', 'amount')),
        amount INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE RESTRICT
      )
    `);

    // Create indexes for performance
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_participants_trip_id ON participants(trip_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_expense_splits_participant_id ON expense_splits(participant_id)`);

    // Create triggers to automatically update updated_at on row updates
    // Trips trigger
    await db.run(sql`
      CREATE TRIGGER IF NOT EXISTS update_trips_updated_at
      AFTER UPDATE ON trips
      FOR EACH ROW
      BEGIN
        UPDATE trips SET updated_at = datetime('now') WHERE id = NEW.id;
      END
    `);

    // Participants trigger
    await db.run(sql`
      CREATE TRIGGER IF NOT EXISTS update_participants_updated_at
      AFTER UPDATE ON participants
      FOR EACH ROW
      BEGIN
        UPDATE participants SET updated_at = datetime('now') WHERE id = NEW.id;
      END
    `);

    // Expenses trigger
    await db.run(sql`
      CREATE TRIGGER IF NOT EXISTS update_expenses_updated_at
      AFTER UPDATE ON expenses
      FOR EACH ROW
      BEGIN
        UPDATE expenses SET updated_at = datetime('now') WHERE id = NEW.id;
      END
    `);

    // Expense splits trigger
    await db.run(sql`
      CREATE TRIGGER IF NOT EXISTS update_expense_splits_updated_at
      AFTER UPDATE ON expense_splits
      FOR EACH ROW
      BEGIN
        UPDATE expense_splits SET updated_at = datetime('now') WHERE id = NEW.id;
      END
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};
