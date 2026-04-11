-- Phase 1-1: Transaction schema 擴展
-- 加入 userId（去正規化 FK）、notes、strategy、emotion 四個欄位

-- 新增欄位（全部 nullable，漸進式 migration 不破壞現有資料）
ALTER TABLE `transactions`
  ADD COLUMN `user_id` BIGINT NULL AFTER `diary_id`,
  ADD COLUMN `notes` TEXT NULL AFTER `trade_date`,
  ADD COLUMN `strategy` VARCHAR(100) NULL AFTER `notes`,
  ADD COLUMN `emotion` VARCHAR(20) NULL AFTER `strategy`;

-- Backfill userId：從對應的 diary 表複製 user_id
-- 只更新有對應 diary 的記錄（應為全部，cascade delete 保證了這一點）
UPDATE `transactions` t
  INNER JOIN `diaries` d ON t.diary_id = d.id
  SET t.user_id = d.user_id
  WHERE t.user_id IS NULL;

-- 複合索引：優化績效儀表板查詢（直接按 userId 查，不需 JOIN diary）
CREATE INDEX `transactions_user_date_idx`
  ON `transactions`(`user_id`, `trade_date` ASC);
