CREATE TABLE `expense_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`emoji` text NOT NULL,
	`trip_id` text,
	`is_system` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 1000 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `trips` ADD `emoji` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `category_id` text REFERENCES expense_categories(id);