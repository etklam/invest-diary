-- Bound each scheduler tick to active alerts in its trigger window.
CREATE INDEX `alerts_active_trigger_idx` ON `alerts` (`is_dismissed`, `trigger_at`);
