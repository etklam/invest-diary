-- Diary v1 contract remediation. Run scripts/audit-diary-contract.sql before
-- deployment to record the affected-row counts for the deployment ticket.
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

-- Repair the denormalized transaction owner before making drift impossible.
UPDATE `transactions` AS `t`
INNER JOIN `diaries` AS `d` ON `d`.`id` = `t`.`diary_id`
SET `t`.`user_id` = `d`.`user_id`
WHERE `t`.`user_id` <> `d`.`user_id`;

ALTER TABLE `diaries`
  MODIFY `review_status` VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD CONSTRAINT `diaries_review_status_check`
    CHECK (`review_status` IN ('none', 'pending', 'reviewed')),
  ADD CONSTRAINT `diaries_review_outcome_check`
    CHECK (`review_outcome` IS NULL OR `review_outcome` IN ('INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR')),
  ADD CONSTRAINT `diaries_review_lifecycle_check`
    CHECK ((`review_status` = 'reviewed' AND `reviewed_at` IS NOT NULL)
      OR (`review_status` <> 'reviewed' AND `reviewed_at` IS NULL
        AND `review_outcome` IS NULL
        AND `review_summary` IS NULL
        AND `review_learning` IS NULL
        AND `review_adjustment` IS NULL)),
  ADD UNIQUE INDEX `diaries_id_user_id_key` (`id`, `user_id`);

ALTER TABLE `transactions`
  DROP FOREIGN KEY `transactions_diary_id_fkey`,
  ADD INDEX `transactions_diary_user_idx` (`diary_id`, `user_id`),
  ADD CONSTRAINT `transactions_diary_user_fkey`
    FOREIGN KEY (`diary_id`, `user_id`) REFERENCES `diaries` (`id`, `user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
