-- AlterTable
ALTER TABLE `telegram_verification_codes` ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0;
