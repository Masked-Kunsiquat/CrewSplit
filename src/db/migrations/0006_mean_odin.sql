-- Migration: Add Onboarding System
-- Adds user settings, onboarding state tracking, and sample data markers
-- Safe for existing users: All new columns have defaults, no data loss

-- 1. Create user_settings table (singleton pattern)
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`primary_user_name` text,
	`default_currency` text DEFAULT 'USD' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);

-- Initialize default row (ensures singleton exists)
INSERT INTO `user_settings` (`id`) VALUES ('default');

-- 2. Create onboarding_state table
CREATE TABLE `onboarding_state` (
	`id` text PRIMARY KEY NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_steps` text DEFAULT '[]' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text
);

-- 3. Add sample data tracking to trips table
-- SAFE: All new columns are nullable or have defaults
ALTER TABLE `trips` ADD `is_sample_data` integer DEFAULT false NOT NULL;
ALTER TABLE `trips` ADD `sample_data_template_id` text;
ALTER TABLE `trips` ADD `is_archived` integer DEFAULT false NOT NULL;

-- 4. Create indexes for common queries
CREATE INDEX `idx_trips_sample_data` ON `trips` (`is_sample_data`, `is_archived`);
CREATE INDEX `idx_trips_archived` ON `trips` (`is_archived`);

-- 5. Add update trigger for user_settings
CREATE TRIGGER `update_user_settings_timestamp`
AFTER UPDATE ON `user_settings`
FOR EACH ROW
BEGIN
  UPDATE `user_settings` SET `updated_at` = datetime('now') WHERE `id` = NEW.`id`;
END;

-- 6. Add update trigger for onboarding_state
CREATE TRIGGER `update_onboarding_state_timestamp`
AFTER UPDATE ON `onboarding_state`
FOR EACH ROW
BEGIN
  UPDATE `onboarding_state` SET `updated_at` = datetime('now') WHERE `id` = NEW.`id`;
END;
