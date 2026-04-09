-- AlterTable
ALTER TABLE `diaries`
    ADD COLUMN `created_via` ENUM('WEB', 'API_KEY') NOT NULL DEFAULT 'WEB',
    ADD COLUMN `created_by_label` VARCHAR(100) NULL;

-- CreateTable
CREATE TABLE `partner_links` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_a_id` BIGINT NOT NULL,
    `user_b_id` BIGINT NOT NULL,
    `initiated_by_user_id` BIGINT NOT NULL,
    `accepted_at` DATETIME(3) NULL,
    `user_a_shares_diaries` BOOLEAN NOT NULL DEFAULT false,
    `user_b_shares_diaries` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partner_links_user_pair_key`(`user_a_id`, `user_b_id`),
    INDEX `partner_links_user_a_idx`(`user_a_id`),
    INDEX `partner_links_user_b_idx`(`user_b_id`),
    INDEX `partner_links_initiated_by_idx`(`initiated_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_key_credentials` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `key_hash` VARCHAR(255) NOT NULL,
    `key_prefix` VARCHAR(24) NOT NULL,
    `scope` ENUM('DIARY_CREATE') NOT NULL DEFAULT 'DIARY_CREATE',
    `last_used_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `api_key_credentials_key_hash_key`(`key_hash`),
    INDEX `api_key_credentials_user_revoked_idx`(`user_id`, `revoked_at`),
    INDEX `api_key_credentials_key_prefix_idx`(`key_prefix`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `partner_links` ADD CONSTRAINT `partner_links_user_a_id_fkey` FOREIGN KEY (`user_a_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_links` ADD CONSTRAINT `partner_links_user_b_id_fkey` FOREIGN KEY (`user_b_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_links` ADD CONSTRAINT `partner_links_initiated_by_user_id_fkey` FOREIGN KEY (`initiated_by_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_key_credentials` ADD CONSTRAINT `api_key_credentials_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
