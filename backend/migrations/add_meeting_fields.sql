-- Add title and duration columns to meetings table
ALTER TABLE `meetings`
ADD COLUMN `title` VARCHAR(255) NULL AFTER `summary`,
ADD COLUMN `duration` INT DEFAULT 0 AFTER `title`;

-- Add index for title if needed
CREATE INDEX `idx_meeting_title` ON `meetings` (`title`);
