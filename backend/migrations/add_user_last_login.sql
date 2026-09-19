-- Track last successful user login for admin visibility
ALTER TABLE users
  ADD COLUMN `last_login_at` TIMESTAMP NULL AFTER `updated_at`;
