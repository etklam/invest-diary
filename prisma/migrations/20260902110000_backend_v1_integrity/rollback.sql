-- Operational rollback for the Backend Ready v1 integrity freeze.
DROP TRIGGER IF EXISTS `trade_plans_diary_owner_insert_v1`;
DROP TRIGGER IF EXISTS `trade_plans_diary_owner_update_v1`;
DROP TRIGGER IF EXISTS `alerts_series_insert_v1`;
DROP TRIGGER IF EXISTS `alerts_series_update_v1`;

ALTER TABLE `price_alerts`
  DROP CONSTRAINT `price_alerts_trigger_state_v1_check`,
  MODIFY `symbol` VARCHAR(20) NOT NULL;

ALTER TABLE `alerts`
  DROP FOREIGN KEY `alerts_parent_diary_fkey`,
  DROP FOREIGN KEY `alerts_parent_id_fkey`,
  DROP CONSTRAINT `alerts_series_consistency_v1_check`,
  DROP INDEX `alerts_id_diary_key`,
  MODIFY `recurring_mode` VARCHAR(20) NULL,
  MODIFY `instance_number` INTEGER NULL DEFAULT 1;

ALTER TABLE `trade_plans`
  DROP CONSTRAINT `trade_plans_zone_order_v1_check`,
  DROP INDEX `trade_plans_diary_user_idx`,
  MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'draft';

ALTER TABLE `diaries`
  DROP CONSTRAINT `diaries_review_lifecycle_v1_check`,
  MODIFY `review_status` VARCHAR(20) NOT NULL DEFAULT 'none',
  MODIFY `review_outcome` VARCHAR(20) NULL;
