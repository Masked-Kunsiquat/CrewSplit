/**
 * DATABASE - SQLite Client
 * LOCAL DATA ENGINEER: Database connection and initialization
 */

import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite/next';

// Open SQLite database
const expoDb = openDatabaseSync('crewsplit.db');

// Create Drizzle instance
export const db = drizzle(expoDb);

/**
 * Initialize database schema
 * Should be called on app startup
 */
export const initializeDatabase = async (): Promise<void> => {
  // TODO: LOCAL DATA ENGINEER implements migrations
  // Run schema migrations here
  console.log('Database initialized');
};
