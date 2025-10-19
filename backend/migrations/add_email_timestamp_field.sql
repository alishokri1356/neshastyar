-- Add lastTimeEmailSent field to meetings table
ALTER TABLE meetings 
ADD COLUMN lastTimeEmailSent TIMESTAMP NULL DEFAULT NULL;

-- Add index for better performance when checking email timestamps
CREATE INDEX idx_meetings_last_email_sent ON meetings(lastTimeEmailSent);
