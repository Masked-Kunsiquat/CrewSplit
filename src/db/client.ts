/**
 * DATABASE - SQLite Client
 * LOCAL DATA ENGINEER: Database connection and initialization
 */

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

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
    // Foreign keys already enabled at module load (see above)

    // Create trips table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        currency TEXT NOT NULL DEFAULT 'USD',
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

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};
