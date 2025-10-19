-- Simple SQL to add the lastTimeEmailSent field
-- Run this directly in your MySQL database

ALTER TABLE meetings ADD COLUMN lastTimeEmailSent TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_meetings_last_email_sent ON meetings(lastTimeEmailSent);
