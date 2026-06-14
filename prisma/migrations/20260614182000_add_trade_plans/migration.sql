CREATE TABLE `trade_plans` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `diary_id` BIGINT NULL,
  `symbol` VARCHAR(32) NOT NULL,
  `setup_type` VARCHAR(100) NULL,
  `entry_price` DECIMAL(18, 6) NULL,
  `entry_zone_low` DECIMAL(18, 6) NULL,
  `entry_zone_high` DECIMAL(18, 6) NULL,
  `stop_loss` DECIMAL(18, 6) NULL,
  `target_price` DECIMAL(18, 6) NULL,
  `max_position_size` DECIMAL(18, 2) NULL,
  `invalidation_condition` TEXT NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `trade_plans_user_status_idx` ON `trade_plans`(`user_id`, `status`);
CREATE INDEX `trade_plans_user_symbol_idx` ON `trade_plans`(`user_id`, `symbol`);
CREATE INDEX `trade_plans_diary_id_idx` ON `trade_plans`(`diary_id`);

ALTER TABLE `trade_plans`
  ADD CONSTRAINT `trade_plans_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `trade_plans`
  ADD CONSTRAINT `trade_plans_diary_id_fkey`
  FOREIGN KEY (`diary_id`) REFERENCES `diaries`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
