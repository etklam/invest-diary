-- AlterTable
ALTER TABLE `diaries` ADD COLUMN `tags` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `favorite_tags` VARCHAR(500) NULL;
