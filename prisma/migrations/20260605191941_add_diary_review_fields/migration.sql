-- AlterTable
ALTER TABLE `diaries` ADD COLUMN `execution` TEXT NULL,
    ADD COLUMN `review_due_at` DATETIME(3) NULL,
    ADD COLUMN `review_status` VARCHAR(20) NULL DEFAULT 'none',
    ADD COLUMN `reviewed_at` DATETIME(3) NULL,
    ADD COLUMN `risk` TEXT NULL,
    ADD COLUMN `thesis` TEXT NULL;
