/**
 * DATABASE - SQLite Client
 * LOCAL DATA ENGINEER: Database connection and migrations bootstrap
 */

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync, deleteDatabaseSync } from 'expo-sqlite';
import migrations from './migrations/migrations';
import * as schema from './schema';

// TEMPORARY: Delete existing database to start fresh
// Remove this after the first successful migration
try {
  deleteDatabaseSync('crewsplit.db');
  console.log('🗑️ Deleted old database');
} catch (error) {
  console.log('No existing database to delete');
}

// Open SQLite database
const expoDb = openDatabaseSync('crewsplit.db');

// CRITICAL: Enable foreign keys immediately after opening connection
// This must happen before any queries to ensure FK constraints are enforced
expoDb.execSync('PRAGMA foreign_keys = ON');

// Create Drizzle instance with schema
export const db = drizzle(expoDb, { schema });

/**
 * React hook to run pending migrations.
 * Blocks UI until all migrations succeed.
 */
export const useDbMigrations = () => {
  const { success, error } = useMigrations(db, migrations);
  return { success, error };
};
