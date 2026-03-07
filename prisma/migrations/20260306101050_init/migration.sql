-- CreateTable
CREATE TABLE `families` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `families_name_key`(`name`),
    INDEX `families_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `family_id` BIGINT NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `role` ENUM('admin', 'parent', 'child') NOT NULL DEFAULT 'child',
    `color_tag` VARCHAR(20) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_family_id_idx`(`family_id`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invite_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `family_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `intended_role` ENUM('parent', 'child') NOT NULL DEFAULT 'child',
    `expires_at` DATETIME(0) NOT NULL,
    `used_at` DATETIME(0) NULL,
    `used_by_user_id` BIGINT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `invite_tokens_token_key`(`token`),
    INDEX `invite_tokens_family_id_idx`(`family_id`),
    INDEX `invite_tokens_token_idx`(`token`),
    INDEX `invite_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `personal_mission` TEXT NULL,
    `core_values` JSON NULL,
    `roles_responsibilities` TEXT NULL,
    `long_term_vision` TEXT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `bio` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `profiles_user_id_key`(`user_id`),
    INDEX `profiles_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `goal_type` ENUM('weekly', 'monthly', 'yearly') NOT NULL,
    `period_start_date` DATE NOT NULL,
    `period_end_date` DATE NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `target_metric` VARCHAR(255) NULL,
    `progress_percentage` INTEGER NULL DEFAULT 0,
    `status` ENUM('not_started', 'in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'not_started',
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `goals_user_id_idx`(`user_id`),
    INDEX `goals_goal_type_idx`(`goal_type`),
    INDEX `goals_period_start_date_period_end_date_idx`(`period_start_date`, `period_end_date`),
    INDEX `goals_status_idx`(`status`),
    INDEX `goals_created_at_idx`(`created_at`),
    INDEX `goals_user_id_goal_type_period_start_date_idx`(`user_id`, `goal_type`, `period_start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_plans` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `plan_date` DATE NOT NULL,
    `theme` VARCHAR(255) NULL,
    `reflection` TEXT NULL,
    `focus_areas` JSON NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `daily_plans_user_id_idx`(`user_id`),
    INDEX `daily_plans_plan_date_idx`(`plan_date`),
    INDEX `daily_plans_created_at_idx`(`created_at`),
    UNIQUE INDEX `daily_plans_user_id_plan_date_key`(`user_id`, `plan_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `daily_plan_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `priority` ENUM('A', 'B', 'C') NOT NULL DEFAULT 'C',
    `sequence_order` INTEGER NOT NULL DEFAULT 0,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `completed_at` DATETIME(0) NULL,
    `estimated_time_minutes` INTEGER NULL,
    `actual_time_minutes` INTEGER NULL,
    `category` VARCHAR(100) NULL,
    `tags` JSON NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `plan_items_daily_plan_id_idx`(`daily_plan_id`),
    INDEX `plan_items_user_id_idx`(`user_id`),
    INDEX `plan_items_priority_idx`(`priority`),
    INDEX `plan_items_is_completed_idx`(`is_completed`),
    INDEX `plan_items_sequence_order_idx`(`sequence_order`),
    INDEX `plan_items_created_at_idx`(`created_at`),
    INDEX `plan_items_daily_plan_id_priority_is_completed_idx`(`daily_plan_id`, `priority`, `is_completed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `start_at` DATETIME(0) NOT NULL,
    `end_at` DATETIME(0) NOT NULL,
    `location` VARCHAR(255) NULL,
    `is_all_day` BOOLEAN NOT NULL DEFAULT false,
    `reminder_minutes` INTEGER NULL DEFAULT 15,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `color_tag` VARCHAR(20) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `appointments_user_id_idx`(`user_id`),
    INDEX `appointments_start_at_idx`(`start_at`),
    INDEX `appointments_user_id_start_at_idx`(`user_id`, `start_at`),
    INDEX `appointments_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `family_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `family_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `start_at` DATETIME(0) NOT NULL,
    `end_at` DATETIME(0) NOT NULL,
    `location` VARCHAR(255) NULL,
    `is_all_day` BOOLEAN NOT NULL DEFAULT false,
    `category` VARCHAR(100) NULL,
    `color_tag` VARCHAR(20) NULL,
    `event_type` ENUM('standard', 'birthday', 'anniversary', 'holiday') NOT NULL DEFAULT 'standard',
    `attendee_user_ids` JSON NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `family_events_family_id_idx`(`family_id`),
    INDEX `family_events_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `family_events_start_at_idx`(`start_at`),
    INDEX `family_events_family_id_start_at_idx`(`family_id`, `start_at`),
    INDEX `family_events_created_at_idx`(`created_at`),
    INDEX `family_events_family_id_start_at_end_at_idx`(`family_id`, `start_at`, `end_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `note_date` DATE NOT NULL,
    `content` LONGTEXT NULL,
    `mood` ENUM('very_sad', 'sad', 'neutral', 'happy', 'very_happy') NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `notes_user_id_idx`(`user_id`),
    INDEX `notes_note_date_idx`(`note_date`),
    INDEX `notes_created_at_idx`(`created_at`),
    UNIQUE INDEX `notes_user_id_note_date_key`(`user_id`, `note_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `family_announcements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `family_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    `is_pinned` BOOLEAN NOT NULL DEFAULT false,
    `pinned_until` DATETIME(0) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `family_announcements_family_id_idx`(`family_id`),
    INDEX `family_announcements_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `family_announcements_is_pinned_idx`(`is_pinned`),
    INDEX `family_announcements_priority_idx`(`priority`),
    INDEX `family_announcements_created_at_idx`(`created_at`),
    INDEX `family_announcements_family_id_created_at_idx`(`family_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emotion_checkins` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `checkin_date` DATE NOT NULL,
    `primary_emotion` VARCHAR(50) NOT NULL,
    `emotion_score` INTEGER NOT NULL,
    `physical_condition` VARCHAR(50) NULL,
    `sleep_quality` INTEGER NULL,
    `sleep_hours` DECIMAL(3, 1) NULL,
    `exercise_minutes` INTEGER NULL,
    `notes` TEXT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `emotion_checkins_user_id_idx`(`user_id`),
    INDEX `emotion_checkins_checkin_date_idx`(`checkin_date`),
    INDEX `emotion_checkins_primary_emotion_idx`(`primary_emotion`),
    INDEX `emotion_checkins_created_at_idx`(`created_at`),
    UNIQUE INDEX `emotion_checkins_user_id_checkin_date_key`(`user_id`, `checkin_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `family_goals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `family_id` BIGINT NOT NULL,
    `created_by_user_id` BIGINT NOT NULL,
    `goal_type` ENUM('weekly', 'monthly', 'yearly') NOT NULL,
    `period_start_date` DATE NOT NULL,
    `period_end_date` DATE NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `target_metric` VARCHAR(255) NULL,
    `progress_percentage` INTEGER NULL DEFAULT 0,
    `status` ENUM('not_started', 'in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'not_started',
    `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `contributor_user_ids` JSON NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `family_goals_family_id_idx`(`family_id`),
    INDEX `family_goals_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `family_goals_goal_type_idx`(`goal_type`),
    INDEX `family_goals_period_start_date_period_end_date_idx`(`period_start_date`, `period_end_date`),
    INDEX `family_goals_status_idx`(`status`),
    INDEX `family_goals_family_id_goal_type_period_start_date_idx`(`family_id`, `goal_type`, `period_start_date`),
    INDEX `family_goals_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invite_tokens` ADD CONSTRAINT `invite_tokens_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invite_tokens` ADD CONSTRAINT `invite_tokens_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invite_tokens` ADD CONSTRAINT `invite_tokens_used_by_user_id_fkey` FOREIGN KEY (`used_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goals` ADD CONSTRAINT `goals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_plans` ADD CONSTRAINT `daily_plans_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_items` ADD CONSTRAINT `plan_items_daily_plan_id_fkey` FOREIGN KEY (`daily_plan_id`) REFERENCES `daily_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_items` ADD CONSTRAINT `plan_items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_events` ADD CONSTRAINT `family_events_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_events` ADD CONSTRAINT `family_events_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notes` ADD CONSTRAINT `notes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_announcements` ADD CONSTRAINT `family_announcements_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_announcements` ADD CONSTRAINT `family_announcements_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emotion_checkins` ADD CONSTRAINT `emotion_checkins_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_goals` ADD CONSTRAINT `family_goals_family_id_fkey` FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_goals` ADD CONSTRAINT `family_goals_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
