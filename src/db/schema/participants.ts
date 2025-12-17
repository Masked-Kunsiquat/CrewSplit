/**
 * LOCAL DATA ENGINEER: Participant Schema
 * Trip members with foreign key to trips table
 */

import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { trips } from "./trips";

/**
 * PARTICIPANTS TABLE
 * Represents members of a trip
 */
export const participants = sqliteTable("participants", {
  // UUID primary key
  id: text("id").primaryKey(),

  // Foreign key to trips table (CASCADE on delete)
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),

  // Participant details
  name: text("name").notNull(),
  avatarColor: text("avatar_color"), // Hex color for UI (#RRGGBB)

  // Timestamps
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Export type inference for TypeScript
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
