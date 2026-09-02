-- Existing refresh rows are stable Web sessions. Give every legacy row its own
-- deterministic family before making the new lineage columns required.
ALTER TABLE `refresh_tokens`
  ADD COLUMN `client_type` ENUM('WEB', 'NATIVE') NOT NULL DEFAULT 'WEB',
  ADD COLUMN `family_id` VARCHAR(64) NULL,
  ADD COLUMN `device_name` VARCHAR(100) NULL,
  ADD COLUMN `parent_id` BIGINT NULL,
  ADD COLUMN `replacement_id` BIGINT NULL,
  ADD COLUMN `revoked_at` DATETIME(3) NULL,
  ADD COLUMN `revocation_reason` ENUM('ROTATED', 'LOGOUT', 'LOGOUT_ALL', 'REUSE_DETECTED', 'EXPIRED') NULL;

UPDATE `refresh_tokens`
SET `family_id` = CONCAT('legacy-web-', `id`)
WHERE `family_id` IS NULL;

ALTER TABLE `refresh_tokens`
  MODIFY `family_id` VARCHAR(64) NOT NULL,
  ADD UNIQUE INDEX `refresh_tokens_replacement_id_key` (`replacement_id`),
  ADD INDEX `refresh_tokens_user_client_idx` (`user_id`, `client_type`),
  ADD INDEX `refresh_tokens_family_revoked_idx` (`family_id`, `revoked_at`),
  ADD INDEX `refresh_tokens_parent_id_idx` (`parent_id`),
  ADD CONSTRAINT `refresh_tokens_parent_id_fkey`
    FOREIGN KEY (`parent_id`) REFERENCES `refresh_tokens` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `refresh_tokens_replacement_id_fkey`
    FOREIGN KEY (`replacement_id`) REFERENCES `refresh_tokens` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

