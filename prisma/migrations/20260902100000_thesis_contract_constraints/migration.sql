-- Thesis v1 contract remediation. Run scripts/audit-diary-contract.sql before
-- deployment and retain its row counts with the release evidence.

-- An ACTIVE thesis must have the two fields that explain the current
-- investment projection. Invalid legacy rows are made explicit drafts rather
-- than being silently accepted by the new CHECK constraint.
UPDATE `investment_theses`
SET `status` = 'DRAFT',
    `activated_at` = NULL,
    `archived_at` = NULL
WHERE `status` = 'ACTIVE'
  AND (`summary` IS NULL OR CHAR_LENGTH(TRIM(`summary`)) = 0
    OR `why_i_own_it` IS NULL OR CHAR_LENGTH(TRIM(`why_i_own_it`)) = 0);

UPDATE `investment_theses`
SET `activated_at` = `updated_at`
WHERE `status` = 'ACTIVE' AND `activated_at` IS NULL;

UPDATE `investment_theses`
SET `archived_at` = `updated_at`
WHERE `status` = 'ARCHIVED' AND `archived_at` IS NULL;

UPDATE `investment_theses`
SET `latest_review_outcome` = NULL
WHERE `last_reviewed_at` IS NULL AND `latest_review_outcome` IS NOT NULL;

UPDATE `investment_theses`
SET `last_reviewed_at` = `updated_at`
WHERE `last_reviewed_at` IS NULL AND `latest_review_outcome` IS NOT NULL;

-- Repair the denormalized review owner before adding the composite FK.
UPDATE `thesis_reviews` AS `review`
INNER JOIN `investment_theses` AS `thesis` ON `thesis`.`id` = `review`.`thesis_id`
SET `review`.`user_id` = `thesis`.`user_id`
WHERE `review`.`user_id` <> `thesis`.`user_id`;

ALTER TABLE `investment_theses`
  ADD UNIQUE INDEX `investment_theses_id_user_id_key` (`id`, `user_id`),
  ADD CONSTRAINT `investment_theses_active_fields_check`
    CHECK (`status` <> 'ACTIVE'
      OR (`summary` IS NOT NULL AND CHAR_LENGTH(TRIM(`summary`)) > 0
        AND `why_i_own_it` IS NOT NULL AND CHAR_LENGTH(TRIM(`why_i_own_it`)) > 0)),
  ADD CONSTRAINT `investment_theses_active_timestamp_check`
    CHECK (`status` <> 'ACTIVE' OR `activated_at` IS NOT NULL),
  ADD CONSTRAINT `investment_theses_archive_timestamp_check`
    CHECK (`status` <> 'ARCHIVED' OR `archived_at` IS NOT NULL),
  ADD CONSTRAINT `investment_theses_review_timestamp_check`
    CHECK ((`last_reviewed_at` IS NULL AND `latest_review_outcome` IS NULL)
      OR (`last_reviewed_at` IS NOT NULL AND `latest_review_outcome` IS NOT NULL));

ALTER TABLE `thesis_reviews`
  DROP FOREIGN KEY `thesis_reviews_thesis_id_fkey`,
  ADD INDEX `thesis_reviews_thesis_user_idx` (`thesis_id`, `user_id`),
  ADD CONSTRAINT `thesis_reviews_thesis_user_fkey`
    FOREIGN KEY (`thesis_id`, `user_id`) REFERENCES `investment_theses` (`id`, `user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
