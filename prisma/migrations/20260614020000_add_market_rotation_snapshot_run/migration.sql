-- CreateTable
CREATE TABLE `market_rotation_snapshot_run` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `rank_scope` VARCHAR(20) NOT NULL,
    `snapshot_date` DATE NULL,
    `status` VARCHAR(32) NOT NULL,
    `symbol_count` INTEGER NOT NULL DEFAULT 0,
    `qualified_symbol_count` INTEGER NOT NULL DEFAULT 0,
    `upserted_count` INTEGER NOT NULL DEFAULT 0,
    `error_count` INTEGER NOT NULL DEFAULT 0,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `market_rotation_snapshot_run_scope_started_idx`(`rank_scope`, `started_at` DESC),
    INDEX `market_rotation_snapshot_run_snapshot_date_idx`(`snapshot_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
