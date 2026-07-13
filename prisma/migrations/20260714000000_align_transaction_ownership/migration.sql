-- ADR-0001: Transaction ownership is derived from Diary.userId.
-- user_id remains a denormalized copy for indexing/query performance only.

-- Repair both legacy NULL values and rows whose copy drifted from the diary.
UPDATE `transactions` t
INNER JOIN `diaries` d ON d.`id` = t.`diary_id`
SET t.`user_id` = d.`user_id`
WHERE t.`user_id` IS NULL
   OR t.`user_id` <> d.`user_id`;

-- Every transaction has a diary FK, and the UPDATE above makes the copy
-- complete before the Prisma schema changes it from nullable to required.
ALTER TABLE `transactions`
  MODIFY COLUMN `user_id` BIGINT NOT NULL;
