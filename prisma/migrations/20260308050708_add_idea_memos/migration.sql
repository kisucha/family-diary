-- CreateTable
CREATE TABLE `idea_memos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NULL,
    `category` VARCHAR(100) NULL,
    `tags` JSON NULL,
    `color_tag` VARCHAR(20) NULL,
    `is_pinned` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `idea_memos_user_id_idx`(`user_id`),
    INDEX `idea_memos_is_pinned_idx`(`is_pinned`),
    INDEX `idea_memos_category_idx`(`category`),
    INDEX `idea_memos_created_at_idx`(`created_at`),
    INDEX `idea_memos_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `idea_memos` ADD CONSTRAINT `idea_memos_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
