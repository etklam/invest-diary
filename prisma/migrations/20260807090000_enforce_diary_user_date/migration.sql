-- Run `npm run diary:duplicates:audit` and, when approved, the
-- reconciliation command after the audit-table migration and before this
-- migration on legacy data.

-- Normalize legacy timestamps before adding the invariant. If the
-- pre-migration duplicate audit was not reconciled, this update can create
-- duplicate keys and MySQL will stop at the ALTER below instead of silently
-- discarding data.
UPDATE `diaries`
SET `date` = TIMESTAMP(DATE(`date`), '12:00:00');

ALTER TABLE `diaries`
  ADD UNIQUE INDEX `diaries_user_date_key` (`user_id`, `date`);
