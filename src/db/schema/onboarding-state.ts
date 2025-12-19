import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const onboardingState = sqliteTable("onboarding_state", {
  id: text("id").primaryKey(), // 'initial_onboarding', 'tour_mode', etc.
  isCompleted: integer("is_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  completedSteps: text("completed_steps", { mode: "json" }).$type<string[]>(),
  metadata: text("metadata", { mode: "json" }),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
  completedAt: text("completed_at"),
});
