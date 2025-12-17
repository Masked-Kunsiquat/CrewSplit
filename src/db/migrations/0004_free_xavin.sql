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
CREATE INDEX `fx_rates_source_idx` ON `fx_rates` (`source`);