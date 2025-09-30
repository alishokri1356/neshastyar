-- Migration: Add email verification fields to users table
-- Run this SQL script to add email verification functionality

ALTER TABLE `users` 
ADD COLUMN `email_verified` BOOLEAN DEFAULT FALSE AFTER `name`,
ADD COLUMN `email_verification_token` VARCHAR(255) NULL AFTER `email_verified`,
ADD COLUMN `email_verification_expires` TIMESTAMP NULL AFTER `email_verification_token`,
ADD COLUMN `password_reset_token` VARCHAR(255) NULL AFTER `email_verification_expires`,
ADD COLUMN `password_reset_expires` TIMESTAMP NULL AFTER `password_reset_token`;

-- Add indexes for the new fields
ALTER TABLE `users` 
ADD INDEX `idx_email_verification_token` (`email_verification_token`),
ADD INDEX `idx_password_reset_token` (`password_reset_token`);

-- Update the table structure documentation
-- New columns added:
-- email_verified: BOOLEAN DEFAULT FALSE
-- email_verification_token: VARCHAR(255) NULL
-- email_verification_expires: TIMESTAMP NULL  
-- password_reset_token: VARCHAR(255) NULL
-- password_reset_expires: TIMESTAMP NULL
