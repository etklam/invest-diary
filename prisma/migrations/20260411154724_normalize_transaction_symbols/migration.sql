-- 修復 symbol 大小寫不一致 bug
-- 之前 create 路徑存的是 raw symbol（如 aapl），
-- update 路徑才有 .toUpperCase()，導致同一股票被算成兩檔
-- 這個 migration 統一把所有現有資料轉大寫+去除空白
UPDATE `transactions` SET `symbol` = UPPER(TRIM(`symbol`)) WHERE `symbol` != UPPER(TRIM(`symbol`));
