ALTER TABLE `diaries`
  ADD COLUMN `review_outcome` VARCHAR(20) NULL,
  ADD COLUMN `review_summary` TEXT NULL,
  ADD COLUMN `review_learning` TEXT NULL,
  ADD COLUMN `review_adjustment` TEXT NULL;
