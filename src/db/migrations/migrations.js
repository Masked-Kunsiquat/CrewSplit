// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';

// Note: babel-plugin-inline-import doesn't work reliably with Expo Metro
// So we manually inline the SQL content instead of importing the .sql file
const m0000 = `CREATE TABLE \`trips\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`description\` text,
	\`start_date\` text NOT NULL,
	\`end_date\` text,
	\`currency\` text DEFAULT 'USD' NOT NULL,
	\`currency_code\` text DEFAULT 'USD' NOT NULL,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL,
	\`updated_at\` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`participants\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`trip_id\` text NOT NULL,
	\`name\` text NOT NULL,
	\`avatar_color\` text,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL,
	\`updated_at\` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (\`trip_id\`) REFERENCES \`trips\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE \`expenses\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`trip_id\` text NOT NULL,
	\`description\` text NOT NULL,
	\`amount\` integer NOT NULL,
	\`currency\` text NOT NULL,
	\`original_currency\` text NOT NULL,
	\`original_amount_minor\` integer NOT NULL,
	\`fx_rate_to_trip\` real,
	\`converted_amount_minor\` integer NOT NULL,
	\`paid_by\` text NOT NULL,
	\`category\` text,
	\`date\` text NOT NULL,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL,
	\`updated_at\` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (\`trip_id\`) REFERENCES \`trips\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`paid_by\`) REFERENCES \`participants\`(\`id\`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE \`expense_splits\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`expense_id\` text NOT NULL,
	\`participant_id\` text NOT NULL,
	\`share\` real NOT NULL,
	\`share_type\` text NOT NULL,
	\`amount\` integer,
	\`created_at\` text DEFAULT (datetime('now')) NOT NULL,
	\`updated_at\` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (\`expense_id\`) REFERENCES \`expenses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`participant_id\`) REFERENCES \`participants\`(\`id\`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_participants_trip_id\` ON \`participants\` (\`trip_id\`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_expenses_trip_id\` ON \`expenses\` (\`trip_id\`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_expenses_paid_by\` ON \`expenses\` (\`paid_by\`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_expense_splits_expense_id\` ON \`expense_splits\` (\`expense_id\`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS \`idx_expense_splits_participant_id\` ON \`expense_splits\` (\`participant_id\`);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS \`update_trips_updated_at\`
AFTER UPDATE ON \`trips\`
FOR EACH ROW
BEGIN
	UPDATE \`trips\` SET \`updated_at\` = datetime('now') WHERE \`id\` = NEW.\`id\`;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS \`update_participants_updated_at\`
AFTER UPDATE ON \`participants\`
FOR EACH ROW
BEGIN
	UPDATE \`participants\` SET \`updated_at\` = datetime('now') WHERE \`id\` = NEW.\`id\`;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS \`update_expenses_updated_at\`
AFTER UPDATE ON \`expenses\`
FOR EACH ROW
BEGIN
	UPDATE \`expenses\` SET \`updated_at\` = datetime('now') WHERE \`id\` = NEW.\`id\`;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS \`update_expense_splits_updated_at\`
AFTER UPDATE ON \`expense_splits\`
FOR EACH ROW
BEGIN
	UPDATE \`expense_splits\` SET \`updated_at\` = datetime('now') WHERE \`id\` = NEW.\`id\`;
END;
`;

export default {
  journal,
  migrations: {
    m0000
  }
};
