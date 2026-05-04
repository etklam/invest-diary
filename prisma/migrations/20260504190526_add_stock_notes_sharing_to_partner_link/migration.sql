-- AlterTable
ALTER TABLE `partner_links` ADD COLUMN `user_a_shares_stock_notes` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `user_b_shares_stock_notes` BOOLEAN NOT NULL DEFAULT false;
