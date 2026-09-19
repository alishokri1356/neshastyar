-- Track last auth email send status for admin visibility
ALTER TABLE users
  ADD COLUMN `last_email_type` VARCHAR(32) NULL AFTER `password_reset_expires`,
  ADD COLUMN `last_email_status` VARCHAR(16) NULL AFTER `last_email_type`,
  ADD COLUMN `last_email_at` TIMESTAMP NULL AFTER `last_email_status`,
  ADD COLUMN `last_email_id` VARCHAR(255) NULL AFTER `last_email_at`,
  ADD COLUMN `last_email_error` TEXT NULL AFTER `last_email_id`;
