ALTER TABLE `transactions`
  DROP FOREIGN KEY `transactions_diary_user_fkey`,
  DROP INDEX `transactions_diary_user_idx`,
  ADD CONSTRAINT `transactions_diary_id_fkey`
    FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `diaries`
  DROP CONSTRAINT `diaries_review_lifecycle_check`,
  DROP CONSTRAINT `diaries_review_outcome_check`,
  DROP CONSTRAINT `diaries_review_status_check`,
  DROP INDEX `diaries_id_user_id_key`,
  MODIFY `review_status` VARCHAR(20) NULL DEFAULT 'none';
