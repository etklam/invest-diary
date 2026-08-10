-- Additive long-term investment context. Existing Diaries, StockNotes and
-- Stock timeline evidence are intentionally not backfilled or reclassified.
CREATE TABLE `diary_stocks` (
  `diary_id` BIGINT NOT NULL,
  `stock_id` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`diary_id`, `stock_id`),
  INDEX `diary_stocks_stock_diary_idx` (`stock_id`, `diary_id`),
  CONSTRAINT `diary_stocks_diary_id_fkey`
    FOREIGN KEY (`diary_id`) REFERENCES `diaries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `diary_stocks_stock_id_fkey`
    FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `investment_theses` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `stock_id` BIGINT NOT NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `summary` TEXT NULL,
  `why_i_own_it` TEXT NULL,
  `growth_drivers` TEXT NULL,
  `risks` TEXT NULL,
  `invalidation_conditions` TEXT NULL,
  `expected_holding_period` VARCHAR(255) NULL,
  `review_due_at` DATETIME(3) NULL,
  `last_reviewed_at` DATETIME(3) NULL,
  `latest_review_outcome` ENUM('INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR') NULL,
  `activated_at` DATETIME(3) NULL,
  `archived_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `investment_theses_user_stock_key` (`user_id`, `stock_id`),
  INDEX `investment_theses_user_status_due_idx` (`user_id`, `status`, `review_due_at`),
  CONSTRAINT `investment_theses_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `investment_theses_stock_id_fkey`
    FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `thesis_reviews` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `thesis_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `reviewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `outcome` ENUM('INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR') NOT NULL,
  `what_improved` TEXT NULL,
  `what_deteriorated` TEXT NULL,
  `what_changed` TEXT NULL,
  `invalidation_triggered` BOOLEAN NOT NULL DEFAULT false,
  `portfolio_decision` ENUM('HOLD', 'ADD', 'REDUCE', 'EXIT', 'CONTINUE_WATCHING') NOT NULL,
  `snapshot_status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL,
  `snapshot_summary` TEXT NULL,
  `snapshot_why_i_own_it` TEXT NULL,
  `snapshot_growth_drivers` TEXT NULL,
  `snapshot_risks` TEXT NULL,
  `snapshot_invalidation_conditions` TEXT NULL,
  `snapshot_expected_holding_period` VARCHAR(255) NULL,
  `snapshot_review_due_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `thesis_reviews_user_thesis_time_idx` (`user_id`, `thesis_id`, `reviewed_at` DESC),
  CONSTRAINT `thesis_reviews_thesis_id_fkey`
    FOREIGN KEY (`thesis_id`) REFERENCES `investment_theses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `thesis_reviews_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
