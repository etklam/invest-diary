-- AlterTable
ALTER TABLE `alerts` ADD COLUMN `instance_number` INTEGER NULL DEFAULT 1,
    ADD COLUMN `is_paused` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `parent_id` BIGINT NULL,
    ADD COLUMN `recurring_mode` VARCHAR(20) NULL;

-- CreateIndex
CREATE INDEX `alerts_parent_id_idx` ON `alerts`(`parent_id`);
