-- CreateTable
CREATE TABLE `etfs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(20) NOT NULL,
    `name` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `etfs_symbol_key`(`symbol`),
    INDEX `etfs_symbol_idx`(`symbol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etf_prices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `etf_id` BIGINT NOT NULL,
    `date` DATE NOT NULL,
    `open` DECIMAL(10, 4) NOT NULL,
    `high` DECIMAL(10, 4) NOT NULL,
    `low` DECIMAL(10, 4) NOT NULL,
    `close` DECIMAL(10, 4) NOT NULL,
    `adj_close` DECIMAL(10, 4) NOT NULL,
    `volume` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `etf_prices_etf_id_date_idx`(`etf_id`, `date` DESC),
    UNIQUE INDEX `etf_prices_etf_id_date_key`(`etf_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etf_alerts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `etf_id` BIGINT NOT NULL,
    `type` ENUM('PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_PERCENT', 'MOVING_AVG') NOT NULL,
    `threshold` DECIMAL(10, 4) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `is_triggered` BOOLEAN NOT NULL DEFAULT false,
    `triggered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `etf_alerts_user_id_is_triggered_idx`(`user_id`, `is_triggered`),
    INDEX `etf_alerts_etf_id_is_triggered_idx`(`etf_id`, `is_triggered`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etf_watchlists` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `etf_id` BIGINT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `etf_watchlists_user_id_sort_order_idx`(`user_id`, `sort_order`),
    UNIQUE INDEX `etf_watchlists_user_id_etf_id_key`(`user_id`, `etf_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `etf_prices` ADD CONSTRAINT `etf_prices_etf_id_fkey` FOREIGN KEY (`etf_id`) REFERENCES `etfs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etf_alerts` ADD CONSTRAINT `etf_alerts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etf_alerts` ADD CONSTRAINT `etf_alerts_etf_id_fkey` FOREIGN KEY (`etf_id`) REFERENCES `etfs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etf_watchlists` ADD CONSTRAINT `etf_watchlists_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etf_watchlists` ADD CONSTRAINT `etf_watchlists_etf_id_fkey` FOREIGN KEY (`etf_id`) REFERENCES `etfs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
