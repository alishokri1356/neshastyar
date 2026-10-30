-- Add optional email address to participants
ALTER TABLE participants
  ADD COLUMN email VARCHAR(255) NULL COMMENT 'Optional contact email for participant'
  AFTER name;
