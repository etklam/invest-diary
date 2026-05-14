/*
  Warnings:

  - You are about to drop the `discipline_checks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `portfolio_snapshots` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `discipline_checks` DROP FOREIGN KEY `discipline_checks_diary_id_fkey`;

-- DropForeignKey
ALTER TABLE `discipline_checks` DROP FOREIGN KEY `discipline_checks_discipline_id_fkey`;

-- DropForeignKey
ALTER TABLE `discipline_checks` DROP FOREIGN KEY `discipline_checks_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `portfolio_snapshots` DROP FOREIGN KEY `portfolio_snapshots_user_id_fkey`;

-- DropTable
DROP TABLE `discipline_checks`;

-- DropTable
DROP TABLE `portfolio_snapshots`;
