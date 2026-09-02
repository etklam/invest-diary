-- Operational rollback for the native-session metadata migration.
-- This intentionally preserves every refresh token row and its original
-- token/user/expiry fields; native-only lineage/revocation metadata is lost.
ALTER TABLE `refresh_tokens`
  DROP FOREIGN KEY `refresh_tokens_parent_id_fkey`,
  DROP FOREIGN KEY `refresh_tokens_replacement_id_fkey`,
  DROP INDEX `refresh_tokens_replacement_id_key`,
  DROP INDEX `refresh_tokens_user_client_idx`,
  DROP INDEX `refresh_tokens_family_revoked_idx`,
  DROP INDEX `refresh_tokens_parent_id_idx`,
  DROP COLUMN `client_type`,
  DROP COLUMN `family_id`,
  DROP COLUMN `device_name`,
  DROP COLUMN `parent_id`,
  DROP COLUMN `replacement_id`,
  DROP COLUMN `revoked_at`,
  DROP COLUMN `revocation_reason`;
