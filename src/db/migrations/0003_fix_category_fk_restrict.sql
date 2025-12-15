-- Fix category_id foreign key to explicitly specify ON DELETE RESTRICT
-- The original migration (0001) added the column without specifying the ON DELETE action
-- SQLite defaults to NO ACTION, but our schema specifies RESTRICT for explicit behavior
-- This migration recreates the table with the correct constraint

PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`original_currency` text NOT NULL,
	`original_amount_minor` integer NOT NULL,
	`fx_rate_to_trip` real,
	`converted_amount_minor` integer NOT NULL,
	`paid_by` text NOT NULL,
	`category_id` text,
	`category` text,
	`date` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paid_by`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_expenses` SELECT `id`, `trip_id`, `description`, `amount`, `currency`, `original_currency`, `original_amount_minor`, `fx_rate_to_trip`, `converted_amount_minor`, `paid_by`, `category_id`, `category`, `date`, `created_at`, `updated_at` FROM `expenses`;
--> statement-breakpoint
DROP TABLE `expenses`;
--> statement-breakpoint
ALTER TABLE `__new_expenses` RENAME TO `expenses`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE INDEX `idx_expenses_trip_id` ON `expenses` (`trip_id`);
--> statement-breakpoint
CREATE INDEX `idx_expenses_paid_by` ON `expenses` (`paid_by`);
--> statement-breakpoint
CREATE INDEX `idx_expenses_category_id` ON `expenses` (`category_id`);
