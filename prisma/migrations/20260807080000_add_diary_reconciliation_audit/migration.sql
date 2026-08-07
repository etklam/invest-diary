CREATE TABLE `diary_reconciliation_audits` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `migration_id` VARCHAR(100) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `diary_date` DATETIME(3) NOT NULL,
  `canonical_diary_id` BIGINT NOT NULL,
  `merged_diary_id` BIGINT NOT NULL,
  `canonical_content_hash_before` CHAR(64) NOT NULL,
  `merged_content_hash_before` CHAR(64) NOT NULL,
  `canonical_content_hash_after` CHAR(64) NOT NULL,
  `transaction_count` INT NOT NULL,
  `alert_count` INT NOT NULL,
  `trade_plan_count` INT NOT NULL,
  `timeline_record_count` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `diary_reconciliation_audits_migration_merged_key` (`migration_id`, `merged_diary_id`),
  INDEX `diary_reconciliation_audits_user_date_idx` (`user_id`, `diary_date`),
  CONSTRAINT `diary_reconciliation_audits_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
