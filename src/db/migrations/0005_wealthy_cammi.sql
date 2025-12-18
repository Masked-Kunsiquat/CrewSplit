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
CREATE INDEX `settlements_date_idx` ON `settlements` (`date`);