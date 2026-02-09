-- =============================================================================
-- Investment Diary System Database Schema
-- Generated from Prisma schema
-- MySQL 5.7+ / 8.0+ compatible
-- =============================================================================

-- Create Database (optional - uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS investment_diary 
-- CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE investment_diary;

-- =============================================================================
-- Create Tables
-- =============================================================================

-- Users table
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NULL,
    `expected_monthly_trades` INTEGER NOT NULL DEFAULT 20,
    `expected_profit` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `expected_avg_holding` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Diaries table
CREATE TABLE `diaries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `diaries_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alerts table
CREATE TABLE `alerts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `diary_id` BIGINT NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `trigger_at` DATETIME(3) NOT NULL,
    `is_dismissed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `alerts_diary_id_fkey`(`diary_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Transactions table
CREATE TABLE `transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `diary_id` BIGINT NOT NULL,
    `symbol` VARCHAR(20) NOT NULL,
    `type` ENUM('BUY', 'SELL') NOT NULL,
    `quantity` DECIMAL(15, 4) NOT NULL,
    `price` DECIMAL(15, 4) NOT NULL,
    `trade_date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transactions_diary_id_fkey`(`diary_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =============================================================================
-- Add Foreign Keys
-- =============================================================================

-- Diaries -> Users
ALTER TABLE `diaries` ADD CONSTRAINT `diaries_user_id_fkey` 
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Alerts -> Diaries
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_diary_id_fkey` 
    FOREIGN KEY (`diary_id`) REFERENCES `diaries`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Transactions -> Diaries
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_diary_id_fkey` 
    FOREIGN KEY (`diary_id`) REFERENCES `diaries`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- Indexes for Performance (Optional)
-- =============================================================================

-- Additional indexes for common queries
CREATE INDEX `idx_diaries_date` ON `diaries` (`date`);
CREATE INDEX `idx_alerts_trigger_at` ON `alerts` (`trigger_at`);
CREATE INDEX `idx_transactions_symbol` ON `transactions` (`symbol`);
CREATE INDEX `idx_transactions_trade_date` ON `transactions` (`trade_date`);
CREATE INDEX `idx_transactions_type` ON `transactions` (`type`);

-- =============================================================================
-- Sample Data (Optional - uncomment for development)
-- =============================================================================

-- -- Sample User
-- INSERT INTO `users` (`email`, `password`, `name`, `expected_monthly_trades`, `expected_profit`, `expected_avg_holding`) 
-- VALUES 
-- ('demo@example.com', '$2b$10$example_hash', 'Demo User', 20, 1000.00, 30.00);

-- -- Sample Diary
-- INSERT INTO `diaries` (`user_id`, `title`, `content`, `date`) 
-- VALUES 
-- (1, 'First Investment Diary', 'Today I bought my first stock!', NOW());

-- -- Sample Transaction
-- INSERT INTO `transactions` (`diary_id`, `symbol`, `type`, `quantity`, `price`, `trade_date`) 
-- VALUES 
-- (1, 'AAPL', 'BUY', 10.0000, 150.0000, NOW());

-- =============================================================================
-- Notes
-- =============================================================================
-- 1. This schema is generated from prisma/schema.prisma
-- 2. Use 'npx prisma migrate diff' to generate future migrations
-- 3. All tables use utf8mb4 charset for full Unicode support
-- 4. Foreign keys use CASCADE delete for data consistency
-- 5. DATETIME(3) provides millisecond precision
-- 6. DECIMAL(15, 4) supports high-precision financial calculations