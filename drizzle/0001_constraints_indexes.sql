-- Hand-written (T1.1): rows written before 0001 may break the new CHECKs or
-- point at deleted parents (databases used before foreign_keys was enabled).
-- Fix them first so the table copies below never fail. Values match
-- `@/types/domain`.
UPDATE `list_entries` SET `score` = NULL WHERE `score` IS NOT NULL AND (`score` < 1 OR `score` > 10);--> statement-breakpoint
UPDATE `list_entries` SET `progress_value` = 0 WHERE `progress_value` < 0;--> statement-breakpoint
UPDATE `list_entries` SET `progress_unit` = NULL WHERE `progress_unit` NOT IN ('episodes', 'chapters', 'pages');--> statement-breakpoint
UPDATE `list_entries` SET `status` = 'plan' WHERE `status` NOT IN ('plan', 'in_progress', 'completed', 'on_hold', 'dropped');--> statement-breakpoint
UPDATE `users` SET `profile_locale` = 'es' WHERE `profile_locale` NOT IN ('es', 'en');--> statement-breakpoint
UPDATE `works` SET `external_source` = NULL WHERE `external_source` NOT IN ('tmdb', 'openlibrary', 'manual');--> statement-breakpoint
UPDATE `works` SET `type` = CASE WHEN `external_source` = 'tmdb' THEN 'movie' ELSE 'book' END WHERE `type` NOT IN ('anime', 'series', 'movie', 'book', 'manga', 'comic');--> statement-breakpoint
-- Orphans: what ON DELETE CASCADE would have removed.
DELETE FROM `accounts` WHERE `user_id` NOT IN (SELECT `id` FROM `users`);--> statement-breakpoint
DELETE FROM `sessions` WHERE `user_id` NOT IN (SELECT `id` FROM `users`);--> statement-breakpoint
DELETE FROM `profile_themes` WHERE `user_id` NOT IN (SELECT `id` FROM `users`);--> statement-breakpoint
DELETE FROM `list_entries` WHERE `user_id` NOT IN (SELECT `id` FROM `users`) OR `work_id` NOT IN (SELECT `id` FROM `works`);--> statement-breakpoint
CREATE TABLE `rate_limit_windows` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_windows_reset_at_idx` ON `rate_limit_windows` (`reset_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_works` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`title_es` text,
	`title_en` text,
	`original_title` text,
	`cover_url` text,
	`year` integer,
	`synopsis` text,
	`synopsis_es` text,
	`synopsis_en` text,
	`external_source` text,
	`external_id` text,
	`episodes_total` integer,
	`chapters_total` integer,
	`pages_total` integer,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "works_type_check" CHECK("__new_works"."type" in ('anime', 'series', 'movie', 'book', 'manga', 'comic')),
	CONSTRAINT "works_external_source_check" CHECK("__new_works"."external_source" is null or "__new_works"."external_source" in ('tmdb', 'openlibrary', 'manual'))
);
--> statement-breakpoint
-- Hand-fixed: drizzle-kit selected the new `created_by` column from the old table.
INSERT INTO `__new_works`("id", "type", "title", "title_es", "title_en", "original_title", "cover_url", "year", "synopsis", "synopsis_es", "synopsis_en", "external_source", "external_id", "episodes_total", "chapters_total", "pages_total", "created_at") SELECT "id", "type", "title", "title_es", "title_en", "original_title", "cover_url", "year", "synopsis", "synopsis_es", "synopsis_en", "external_source", "external_id", "episodes_total", "chapters_total", "pages_total", "created_at" FROM `works`;--> statement-breakpoint
DROP TABLE `works`;--> statement-breakpoint
ALTER TABLE `__new_works` RENAME TO `works`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `works_external_source_external_id_unique` ON `works` (`external_source`,`external_id`) WHERE "works"."external_source" is not null and "works"."external_id" is not null;--> statement-breakpoint
CREATE INDEX `works_type_idx` ON `works` (`type`);--> statement-breakpoint
CREATE INDEX `works_created_by_idx` ON `works` (`created_by`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_list_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`work_id` text NOT NULL,
	`status` text NOT NULL,
	`score` integer,
	`progress_value` integer DEFAULT 0 NOT NULL,
	`progress_unit` text,
	`notes` text,
	`started_at` integer,
	`finished_at` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "list_entries_score_check" CHECK("__new_list_entries"."score" is null or "__new_list_entries"."score" between 1 and 10),
	CONSTRAINT "list_entries_progress_check" CHECK("__new_list_entries"."progress_value" >= 0),
	CONSTRAINT "list_entries_status_check" CHECK("__new_list_entries"."status" in ('plan', 'in_progress', 'completed', 'on_hold', 'dropped')),
	CONSTRAINT "list_entries_progress_unit_check" CHECK("__new_list_entries"."progress_unit" is null or "__new_list_entries"."progress_unit" in ('episodes', 'chapters', 'pages'))
);
--> statement-breakpoint
INSERT INTO `__new_list_entries`("id", "user_id", "work_id", "status", "score", "progress_value", "progress_unit", "notes", "started_at", "finished_at", "updated_at") SELECT "id", "user_id", "work_id", "status", "score", "progress_value", "progress_unit", "notes", "started_at", "finished_at", "updated_at" FROM `list_entries`;--> statement-breakpoint
DROP TABLE `list_entries`;--> statement-breakpoint
ALTER TABLE `__new_list_entries` RENAME TO `list_entries`;--> statement-breakpoint
CREATE INDEX `list_entries_user_updated_idx` ON `list_entries` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `list_entries_user_status_idx` ON `list_entries` (`user_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `list_entries_user_id_work_id_unique` ON `list_entries` (`user_id`,`work_id`);--> statement-breakpoint
CREATE INDEX `search_cache_expires_at_idx` ON `search_cache` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_tokens_expires_idx` ON `verification_tokens` (`expires`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer,
	`image` text,
	`username` text,
	`display_name` text,
	`profile_locale` text DEFAULT 'es' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "users_profile_locale_check" CHECK("__new_users"."profile_locale" in ('es', 'en'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "name", "email", "email_verified", "image", "username", "display_name", "profile_locale", "created_at") SELECT "id", "name", "email", "email_verified", "image", "username", "display_name", "profile_locale", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);