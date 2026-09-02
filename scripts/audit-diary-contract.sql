-- Read-only pre-migration audit for the Diary v1 review/owner invariants.
SELECT
  SUM(`review_status` IS NULL OR `review_status` NOT IN ('none', 'pending', 'reviewed')) AS `invalid_review_status_rows`,
  SUM(`review_outcome` IS NOT NULL AND `review_outcome` NOT IN ('INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR')) AS `invalid_review_outcome_rows`,
  SUM(`review_status` = 'reviewed' AND `reviewed_at` IS NULL) AS `reviewed_without_timestamp_rows`,
  SUM(`review_status` <> 'reviewed' AND (`reviewed_at` IS NOT NULL OR `review_outcome` IS NOT NULL
    OR `review_summary` IS NOT NULL OR `review_learning` IS NOT NULL OR `review_adjustment` IS NOT NULL)) AS `non_reviewed_with_post_mortem_rows`
FROM `diaries`;

SELECT COUNT(*) AS `transaction_owner_mismatch_rows`
FROM `transactions` AS `t`
INNER JOIN `diaries` AS `d` ON `d`.`id` = `t`.`diary_id`
WHERE `t`.`user_id` <> `d`.`user_id`;

SELECT COUNT(*) AS `trade_plan_diary_owner_mismatch_rows`
FROM `trade_plans` AS `p`
LEFT JOIN `diaries` AS `d` ON `d`.`id` = `p`.`diary_id`
WHERE `p`.`diary_id` IS NOT NULL
  AND (`d`.`id` IS NULL OR `p`.`user_id` <> `d`.`user_id`);
