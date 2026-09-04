CREATE TABLE `telegram_payments` (
	`charge_id` text PRIMARY KEY NOT NULL,
	`telegram_user_id` text NOT NULL,
	`points` integer NOT NULL,
	`currency` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `telegram_users` (
	`telegram_user_id` text PRIMARY KEY NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
