-- AlterTable
ALTER TABLE `disciplines` ADD COLUMN `display_order` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `discipline_order_idx` ON `disciplines`(`display_order`);
