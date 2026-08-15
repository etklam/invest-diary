-- Research Capture Loop: extend StockTimelineSourceType with 4 research
-- provenance labels (web evidence write path).
ALTER TABLE `stock_timeline_records`
    MODIFY COLUMN `source_type` ENUM('TRADE_BASIC_DIARY', 'VIDEO_TRANSCRIBE_SUMMARIZE', 'DIARY', 'ARTICLE', 'MANUAL', 'SYSTEM', 'MARKET_ROTATION', 'SEC_FILING', 'RELATIVE_VALUE', 'SEASONALITY') NOT NULL;
