CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`currency_code` text DEFAULT 'USD' NOT NULL,
	`emoji` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`is_sample_data` integer DEFAULT false NOT NULL,
	`sample_data_template_id` text,
	`is_archived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`name` text NOT NULL,
	`avatar_color` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`description` text NOT NULL,
	`notes` text,
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
CREATE TABLE `expense_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`share` real NOT NULL,
	`share_type` text NOT NULL,
	`amount` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
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
CREATE TABLE `fx_rate_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`fx_rate_id` text NOT NULL,
	`snapshot_type` text NOT NULL,
	`snapshot_at` text DEFAULT (datetime('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fx_rate_id`) REFERENCES `fx_rates`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `fx_rate_snapshots_trip_id_idx` ON `fx_rate_snapshots` (`trip_id`);--> statement-breakpoint
CREATE INDEX `fx_rate_snapshots_fx_rate_id_idx` ON `fx_rate_snapshots` (`fx_rate_id`);--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`base_currency` text NOT NULL,
	`quote_currency` text NOT NULL,
	`rate` real NOT NULL,
	`source` text NOT NULL,
	`fetched_at` text NOT NULL,
	`priority` integer DEFAULT 50 NOT NULL,
	`metadata` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fx_rates_currency_pair_idx` ON `fx_rates` (`base_currency`,`quote_currency`,`is_archived`);--> statement-breakpoint
CREATE INDEX `fx_rates_fetched_at_idx` ON `fx_rates` (`fetched_at`);--> statement-breakpoint
CREATE INDEX `fx_rates_source_idx` ON `fx_rates` (`source`);--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`from_participant_id` text NOT NULL,
	`to_participant_id` text NOT NULL,
	`expense_split_id` text,
	`original_currency` text NOT NULL,
	`original_amount_minor` integer NOT NULL,
	`fx_rate_to_trip` real,
	`converted_amount_minor` integer NOT NULL,
	`date` text NOT NULL,
	`description` text,
	`payment_method` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`expense_split_id`) REFERENCES `expense_splits`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `settlements_trip_id_idx` ON `settlements` (`trip_id`);--> statement-breakpoint
CREATE INDEX `settlements_from_participant_idx` ON `settlements` (`from_participant_id`);--> statement-breakpoint
CREATE INDEX `settlements_to_participant_idx` ON `settlements` (`to_participant_id`);--> statement-breakpoint
CREATE INDEX `settlements_expense_split_idx` ON `settlements` (`expense_split_id`);--> statement-breakpoint
CREATE INDEX `settlements_date_idx` ON `settlements` (`date`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`primary_user_name` text,
	`default_currency` text DEFAULT 'USD' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `onboarding_state` (
	`id` text PRIMARY KEY NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_steps` text DEFAULT '[]' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text
);
