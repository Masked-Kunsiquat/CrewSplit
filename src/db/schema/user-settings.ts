// LOCAL DATA ENGINEER
import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userSettings = sqliteTable("user_settings", {
  id: text("id").primaryKey().notNull().default("default"),
  primaryUserName: text("primary_user_name"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
