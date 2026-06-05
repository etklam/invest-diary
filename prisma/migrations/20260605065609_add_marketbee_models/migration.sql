/*
  Warnings:

  - You are about to drop the `etf_alerts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `etf_alerts` DROP FOREIGN KEY `etf_alerts_etf_id_fkey`;

-- DropForeignKey
ALTER TABLE `etf_alerts` DROP FOREIGN KEY `etf_alerts_user_id_fkey`;

-- DropTable
DROP TABLE `etf_alerts`;

-- CreateTable
CREATE TABLE `market_universe` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(20) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `exchange` VARCHAR(32) NOT NULL,
    `asset_type` VARCHAR(32) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sector` VARCHAR(100) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `market_universe_symbol_key`(`symbol`),
    INDEX `market_universe_symbol_idx`(`symbol`),
    INDEX `market_universe_active_asset_type_idx`(`is_active`, `asset_type`),
    INDEX `market_universe_exchange_active_idx`(`exchange`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `market_breadth_daily` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `universe_key` VARCHAR(32) NOT NULL,
    `date` DATE NOT NULL,
    `universe_count` INTEGER NOT NULL,
    `up4_count` INTEGER NULL,
    `down4_count` INTEGER NULL,
    `up4_pct` DECIMAL(8, 4) NULL,
    `down4_pct` DECIMAL(8, 4) NULL,
    `above40d_count` INTEGER NULL,
    `above40d_pct` DECIMAL(8, 4) NULL,
    `ratio_5d` DECIMAL(12, 4) NULL,
    `ratio_10d` DECIMAL(12, 4) NULL,
    `regime` VARCHAR(32) NULL,
    `score` INTEGER NULL,
    `coverage_pct` DECIMAL(5, 2) NULL,
    `is_stale` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `market_breadth_daily_universe_date_idx`(`universe_key`, `date` DESC),
    UNIQUE INDEX `market_breadth_daily_universe_date_key`(`universe_key`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `market_daily_price` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `symbol` VARCHAR(20) NOT NULL,
    `date` DATE NOT NULL,
    `open` DECIMAL(18, 6) NOT NULL,
    `high` DECIMAL(18, 6) NOT NULL,
    `low` DECIMAL(18, 6) NOT NULL,
    `close` DECIMAL(18, 6) NOT NULL,
    `adjusted_close` DECIMAL(18, 6) NOT NULL,
    `volume` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `market_daily_price_symbol_date_idx`(`symbol`, `date`),
    INDEX `market_daily_price_date_idx`(`date`),
    UNIQUE INDEX `market_daily_price_symbol_date_key`(`symbol`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
