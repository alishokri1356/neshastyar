-- Google Sign-In support
ALTER TABLE users
  ADD COLUMN `google_id` VARCHAR(255) NULL UNIQUE AFTER `email`,
  ADD COLUMN `auth_provider` VARCHAR(32) NULL AFTER `google_id`,
  MODIFY COLUMN `password_hash` VARCHAR(255) NULL;

UPDATE users
SET auth_provider = 'password'
WHERE auth_provider IS NULL AND password_hash IS NOT NULL;
