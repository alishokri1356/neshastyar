-- Add fields for audio file storage (filesystem/cloud storage approach)
-- This is the RECOMMENDED approach for large files (100MB+)

ALTER TABLE `meetings`
ADD COLUMN `audio_file_path` VARCHAR(500) NULL COMMENT 'Full path to audio file on disk or cloud storage',
ADD COLUMN `audio_file_size` BIGINT NULL COMMENT 'File size in bytes',
ADD COLUMN `audio_duration` INT DEFAULT 0 COMMENT 'Audio duration in seconds',
ADD COLUMN `audio_format` VARCHAR(50) NULL COMMENT 'Audio format (mp3, wav, ogg, etc.)',
ADD COLUMN `title` VARCHAR(255) NULL COMMENT 'Meeting title';

-- Add indexes for better performance
CREATE INDEX `idx_audio_file_path` ON `meetings` (`audio_file_path`);

