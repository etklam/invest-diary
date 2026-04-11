-- CreateTable
CREATE TABLE `portfolio_snapshots` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `snapshot_date` DATE NOT NULL,
    `total_cost` DECIMAL(18, 4) NOT NULL,
    `total_market_value` DECIMAL(18, 4) NOT NULL,
    `holdings_json` TEXT NOT NULL,
    `benchmark_symbol` VARCHAR(20) NOT NULL DEFAULT 'SPY',
    `benchmark_price` DECIMAL(18, 4) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `portfolio_snapshots_user_date_idx`(`user_id`, `snapshot_date` DESC),
    UNIQUE INDEX `portfolio_snapshots_user_date_key`(`user_id`, `snapshot_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `portfolio_snapshots` ADD CONSTRAINT `portfolio_snapshots_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
