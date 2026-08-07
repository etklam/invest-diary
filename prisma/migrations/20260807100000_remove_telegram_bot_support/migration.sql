-- Remove Telegram Bot account-linking and delivery state.
-- Historical Diary rows keep their TELEGRAM_BOT created_via value in the DiaryCreatedVia enum.
DROP TABLE `telegram_processed_updates`;
DROP TABLE `telegram_sessions`;
DROP TABLE `telegram_verification_codes`;
DROP TABLE `telegram_accounts`;
