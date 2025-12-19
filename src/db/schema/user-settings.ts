import { text } from "drizzle-orm/sqlite-core";
import { table } from "drizzle-orm/sqlite-core";

export const userSettings = table("user_settings", {
  id: text("id").primaryKey().notNull().default("default"),
  primaryUserName: text("primary_user_name"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});
