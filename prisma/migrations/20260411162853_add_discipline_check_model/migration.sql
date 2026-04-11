-- CreateTable
CREATE TABLE `discipline_checks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `diary_id` BIGINT NULL,
    `discipline_id` BIGINT NULL,
    `passed` BOOLEAN NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `discipline_checks_user_created_idx`(`user_id`, `created_at` DESC),
    INDEX `discipline_checks_diary_id_idx`(`diary_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `discipline_checks` ADD CONSTRAINT `discipline_checks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discipline_checks` ADD CONSTRAINT `discipline_checks_diary_id_fkey` FOREIGN KEY (`diary_id`) REFERENCES `diaries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discipline_checks` ADD CONSTRAINT `discipline_checks_discipline_id_fkey` FOREIGN KEY (`discipline_id`) REFERENCES `disciplines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
