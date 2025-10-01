-- Add fields for audio file storage (filesystem/cloud storage approach)
-- This is the RECOMMENDED approach for large files (100MB+)

ALTER TABLE `meetings`
ADD COLUMN `audio_file_path` VARCHAR(500) NULL COMMENT 'Full path to audio file on disk or cloud storage',
ADD COLUMN `audio_file_size` BIGINT NULL COMMENT 'File size in bytes',
ADD COLUMN `audio_duration` INT DEFAULT 0 COMMENT 'Audio duration in seconds',
ADD COLUMN `audio_format` VARCHAR(50) NULL COMMENT 'Audio format (mp3, wav, ogg, etc.)',
ADD COLUMN `title` VARCHAR(255) NULL COMMENT 'Meeting title',
ADD COLUMN `storage_type` ENUM('local', 's3', 'other') DEFAULT 'local' COMMENT 'Where the file is stored';

-- Add indexes for better performance
CREATE INDEX `idx_audio_file_path` ON `meetings` (`audio_file_path`);
CREATE INDEX `idx_storage_type` ON `meetings` (`storage_type`);

-- Update existing records to set default storage type
UPDATE `meetings` SET `storage_type` = 'local' WHERE `storage_type` IS NULL;

