-- CreateIndex
CREATE INDEX `diaries_user_created_idx` ON `diaries`(`user_id`, `created_at` DESC);

-- CreateIndex
CREATE INDEX `posts_status_published_idx` ON `posts`(`status`, `published_at` DESC);

-- CreateIndex
CREATE INDEX `posts_category_status_idx` ON `posts`(`category`, `status`);

-- CreateIndex
CREATE INDEX `transactions_symbol_date_idx` ON `transactions`(`symbol`, `trade_date` ASC);
