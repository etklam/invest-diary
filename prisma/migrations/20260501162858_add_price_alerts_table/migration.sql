-- CreateTable
CREATE TABLE `price_alerts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `symbol` VARCHAR(20) NOT NULL,
    `type` ENUM('PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_PERCENT', 'MOVING_AVG') NOT NULL,
    `threshold` DECIMAL(10, 4) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `is_triggered` BOOLEAN NOT NULL DEFAULT false,
    `triggered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `price_alerts_user_id_is_triggered_idx`(`user_id`, `is_triggered`),
    INDEX `price_alerts_symbol_is_triggered_idx`(`symbol`, `is_triggered`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `price_alerts` ADD CONSTRAINT `price_alerts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
