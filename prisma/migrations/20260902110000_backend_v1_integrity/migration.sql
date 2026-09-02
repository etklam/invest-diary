-- Backend Ready v1 integrity freeze for Diary Review, Trade Plan and Alerts.
-- The UPDATE statements are the documented legacy remediation. They make
-- invalid rows explicit before strict enums/checks/FKs are installed.

-- Diary Review lifecycle ---------------------------------------------------
UPDATE `diaries`
SET `review_status` = CASE
  WHEN `reviewed_at` IS NOT NULL THEN 'reviewed'
  WHEN `review_due_at` IS NOT NULL THEN 'pending'
  ELSE 'none'
END
WHERE `review_status` IS NULL
   OR `review_status` NOT IN ('none', 'pending', 'reviewed');

UPDATE `diaries`
SET `review_outcome` = NULL
WHERE `review_outcome` IS NOT NULL
  AND `review_outcome` NOT IN ('INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR');

UPDATE `diaries`
SET `reviewed_at` = `updated_at`
WHERE `review_status` = 'reviewed' AND `reviewed_at` IS NULL;

UPDATE `diaries`
SET `reviewed_at` = NULL,
    `review_outcome` = NULL,
    `review_summary` = NULL,
    `review_learning` = NULL,
    `review_adjustment` = NULL
WHERE `review_status` <> 'reviewed';

ALTER TABLE `diaries`
  MODIFY `review_status` ENUM('none', 'pending', 'reviewed') NOT NULL DEFAULT 'none',
  MODIFY `review_outcome` ENUM('INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR') NULL,
  ADD CONSTRAINT `diaries_review_lifecycle_v1_check`
    CHECK ((`review_status` = 'reviewed' AND `reviewed_at` IS NOT NULL)
      OR (`review_status` <> 'reviewed' AND `reviewed_at` IS NULL
        AND `review_outcome` IS NULL
        AND `review_summary` IS NULL
        AND `review_learning` IS NULL
        AND `review_adjustment` IS NULL));

-- Trade Plan lifecycle and owner invariant -------------------------------
UPDATE `trade_plans`
SET `status` = 'draft'
WHERE `status` IS NULL OR `status` NOT IN ('draft', 'active', 'closed', 'cancelled');

-- A linked Diary owned by another user is not recoverable from the Trade Plan
-- row. Detach it before installing the write-time owner trigger; the API will
-- then return a safe null Diary link instead of leaking the foreign record.
UPDATE `trade_plans` AS `plan`
LEFT JOIN `diaries` AS `diary` ON `diary`.`id` = `plan`.`diary_id`
SET `plan`.`diary_id` = NULL
WHERE `plan`.`diary_id` IS NOT NULL
  AND (`diary`.`id` IS NULL OR `diary`.`user_id` <> `plan`.`user_id`);

ALTER TABLE `trade_plans`
  MODIFY `status` ENUM('draft', 'active', 'closed', 'cancelled') NOT NULL DEFAULT 'draft',
  ADD CONSTRAINT `trade_plans_zone_order_v1_check`
    CHECK (`entry_zone_low` IS NULL OR `entry_zone_high` IS NULL OR `entry_zone_low` <= `entry_zone_high`),
  ADD INDEX `trade_plans_diary_user_idx` (`diary_id`, `user_id`);

-- A TradePlan keeps its user_id for direct owner queries. These triggers make
-- the denormalized owner copy impossible to mismatch while preserving the
-- existing SET NULL behaviour when a linked Diary is deleted.
DROP TRIGGER IF EXISTS `trade_plans_diary_owner_insert_v1`;
DROP TRIGGER IF EXISTS `trade_plans_diary_owner_update_v1`;

CREATE TRIGGER `trade_plans_diary_owner_insert_v1`
BEFORE INSERT ON `trade_plans`
FOR EACH ROW
BEGIN
  IF NEW.`diary_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `diaries` WHERE `id` = NEW.`diary_id` AND `user_id` = NEW.`user_id`
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'trade_plans diary owner mismatch';
  END IF;
END;

CREATE TRIGGER `trade_plans_diary_owner_update_v1`
BEFORE UPDATE ON `trade_plans`
FOR EACH ROW
BEGIN
  IF NEW.`diary_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `diaries` WHERE `id` = NEW.`diary_id` AND `user_id` = NEW.`user_id`
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'trade_plans diary owner mismatch';
  END IF;
END;

-- Alert series / recurrence integrity ------------------------------------
UPDATE `alerts`
SET `parent_id` = NULL
WHERE `parent_id` = 0;

UPDATE `alerts`
SET `instance_number` = 1
WHERE `instance_number` IS NULL OR `instance_number` < 1;

UPDATE `alerts`
SET `recurring_mode` = NULL,
    `parent_id` = NULL,
    `instance_number` = 1
WHERE `recurring_mode` IS NULL
   OR `recurring_mode` NOT IN ('WEEK', 'MONTH');

-- A series root is always self-parented. Orphaned/mismatched legacy children
-- are made explicit single alerts because guessing their series is unsafe.
UPDATE `alerts`
SET `parent_id` = `id`
WHERE `recurring_mode` IS NOT NULL AND `instance_number` = 1;

UPDATE `alerts` AS child
LEFT JOIN `alerts` AS parent ON parent.`id` = child.`parent_id`
SET child.`recurring_mode` = NULL,
    child.`parent_id` = NULL,
    child.`instance_number` = 1
WHERE child.`recurring_mode` IS NOT NULL
  AND child.`instance_number` > 1
  AND (parent.`id` IS NULL
    OR parent.`diary_id` <> child.`diary_id`
    OR parent.`recurring_mode` IS NULL
    OR parent.`recurring_mode` <> child.`recurring_mode`
    OR parent.`instance_number` <> 1);

ALTER TABLE `alerts`
  MODIFY `recurring_mode` ENUM('WEEK', 'MONTH') NULL,
  MODIFY `instance_number` INTEGER NOT NULL DEFAULT 1,
  ADD UNIQUE INDEX `alerts_id_diary_key` (`id`, `diary_id`),
  ADD CONSTRAINT `alerts_series_consistency_v1_check`
    CHECK ((`recurring_mode` IS NULL AND `instance_number` = 1)
      OR (`recurring_mode` IS NOT NULL AND `instance_number` >= 1));

-- MariaDB cannot add a CHECK expression that references a column which is
-- subsequently used by a composite foreign key. Keep the lifecycle part in
-- the CHECK above and enforce the parent-nullability transition in triggers.
-- A recurring root is temporarily parentless while persistAlert creates it;
-- the follow-up update self-parents it inside the same transaction.
ALTER TABLE `alerts`
  ADD CONSTRAINT `alerts_parent_id_fkey`
    FOREIGN KEY (`parent_id`) REFERENCES `alerts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `alerts`
  ADD CONSTRAINT `alerts_parent_diary_fkey`
    FOREIGN KEY (`parent_id`, `diary_id`) REFERENCES `alerts` (`id`, `diary_id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

DROP TRIGGER IF EXISTS `alerts_series_insert_v1`;
DROP TRIGGER IF EXISTS `alerts_series_update_v1`;

CREATE TRIGGER `alerts_series_insert_v1`
BEFORE INSERT ON `alerts`
FOR EACH ROW
BEGIN
  IF (NEW.`recurring_mode` IS NULL AND NEW.`parent_id` IS NOT NULL)
     OR (NEW.`recurring_mode` IS NOT NULL AND NEW.`instance_number` > 1 AND NEW.`parent_id` IS NULL)
  THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'alerts series parent mismatch';
  END IF;
END;

CREATE TRIGGER `alerts_series_update_v1`
BEFORE UPDATE ON `alerts`
FOR EACH ROW
BEGIN
  IF (NEW.`recurring_mode` IS NULL AND NEW.`parent_id` IS NOT NULL)
     OR (NEW.`recurring_mode` IS NOT NULL AND NEW.`instance_number` > 1 AND NEW.`parent_id` IS NULL)
     OR (NEW.`recurring_mode` IS NOT NULL AND NEW.`instance_number` = 1
         AND NEW.`parent_id` IS NOT NULL AND NEW.`parent_id` <> NEW.`id`)
  THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'alerts series parent mismatch';
  END IF;
END;

-- Price Alert trigger state ----------------------------------------------
ALTER TABLE `price_alerts`
  MODIFY `symbol` VARCHAR(32) NOT NULL;

UPDATE `price_alerts`
SET `triggered_at` = `updated_at`
WHERE `is_triggered` = true AND `triggered_at` IS NULL;

UPDATE `price_alerts`
SET `is_triggered` = false,
    `triggered_at` = NULL
WHERE `is_triggered` = false AND `triggered_at` IS NOT NULL;

ALTER TABLE `price_alerts`
  ADD CONSTRAINT `price_alerts_trigger_state_v1_check`
    CHECK ((`is_triggered` = false AND `triggered_at` IS NULL)
      OR (`is_triggered` = true AND `triggered_at` IS NOT NULL));
