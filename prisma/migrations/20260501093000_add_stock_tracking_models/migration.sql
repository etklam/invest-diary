-- AlterTable
ALTER TABLE `api_key_credentials`
    MODIFY `scope` ENUM('DIARY_CREATE', 'AGENT_WRITE') NOT NULL DEFAULT 'DIARY_CREATE';

-- CreateTable
CREATE TABLE `stocks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(32) NOT NULL,
    `quote_symbol` VARCHAR(32) NULL,
    `name` VARCHAR(255) NULL,
    `exchange` VARCHAR(32) NULL,
    `currency` VARCHAR(8) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stocks_symbol_key`(`symbol`),
    INDEX `stocks_symbol_idx`(`symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_watchlists` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `stock_id` BIGINT NOT NULL,
    `status` ENUM('WATCHING', 'ARCHIVED') NOT NULL DEFAULT 'WATCHING',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_watchlists_user_stock_key`(`user_id`, `stock_id`),
    INDEX `stock_watchlists_user_status_sort_idx`(`user_id`, `status`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_timeline_records` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `stock_id` BIGINT NOT NULL,
    `summary` TEXT NOT NULL,
    `source_type` ENUM('TRADE_BASIC_DIARY', 'VIDEO_TRANSCRIBE_SUMMARIZE', 'DIARY', 'ARTICLE', 'MANUAL', 'SYSTEM') NOT NULL,
    `source_title` VARCHAR(255) NULL,
    `source_url` VARCHAR(1000) NULL,
    `source_diary_id` BIGINT NULL,
    `source_external_id` VARCHAR(255) NULL,
    `source_excerpt` TEXT NULL,
    `confidence` TINYINT UNSIGNED NULL,
    `idempotency_key` VARCHAR(128) NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL,
    `created_via` ENUM('API_KEY', 'WEB', 'SYSTEM') NOT NULL DEFAULT 'API_KEY',
    `created_by_label` VARCHAR(100) NULL,
    `metadata_json` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stock_timeline_records_user_stock_idempotency_key`(`user_id`, `stock_id`, `idempotency_key`),
    INDEX `stock_timeline_records_user_stock_time_idx`(`user_id`, `stock_id`, `occurred_at` DESC),
    INDEX `stock_timeline_records_user_time_idx`(`user_id`, `occurred_at` DESC),
    INDEX `stock_timeline_records_source_external_idx`(`source_type`, `source_external_id`),
    INDEX `stock_timeline_records_source_diary_idx`(`source_diary_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock_watchlists` ADD CONSTRAINT `stock_watchlists_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_watchlists` ADD CONSTRAINT `stock_watchlists_stock_id_fkey`
FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_timeline_records` ADD CONSTRAINT `stock_timeline_records_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_timeline_records` ADD CONSTRAINT `stock_timeline_records_stock_id_fkey`
FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_timeline_records` ADD CONSTRAINT `stock_timeline_records_source_diary_id_fkey`
FOREIGN KEY (`source_diary_id`) REFERENCES `diaries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
