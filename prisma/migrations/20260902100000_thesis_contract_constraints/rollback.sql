ALTER TABLE `thesis_reviews`
  DROP FOREIGN KEY `thesis_reviews_thesis_user_fkey`,
  DROP INDEX `thesis_reviews_thesis_user_idx`,
  ADD CONSTRAINT `thesis_reviews_thesis_id_fkey`
    FOREIGN KEY (`thesis_id`) REFERENCES `investment_theses` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `investment_theses`
  DROP CONSTRAINT `investment_theses_active_fields_check`,
  DROP CONSTRAINT `investment_theses_active_timestamp_check`,
  DROP CONSTRAINT `investment_theses_archive_timestamp_check`,
  DROP CONSTRAINT `investment_theses_review_timestamp_check`,
  DROP INDEX `investment_theses_id_user_id_key`;
