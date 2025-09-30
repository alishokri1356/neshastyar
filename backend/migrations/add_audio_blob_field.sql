-- Add BLOB field for audio file storage
-- WARNING: NOT RECOMMENDED for large files (100MB+)
-- This approach will make your database very large and slow
-- Use this ONLY for small files (<10MB)

ALTER TABLE `meetings`
ADD COLUMN `audio_file_blob` LONGBLOB NULL COMMENT 'Audio file binary data (NOT recommended for large files)',
ADD COLUMN `audio_file_size` BIGINT NULL COMMENT 'File size in bytes',
ADD COLUMN `audio_duration` INT DEFAULT 0 COMMENT 'Audio duration in seconds',
ADD COLUMN `audio_format` VARCHAR(50) NULL COMMENT 'Audio format (mp3, wav, ogg, etc.)',
ADD COLUMN `title` VARCHAR(255) NULL COMMENT 'Meeting title';

-- Note: LONGBLOB can store up to 4GB, but this will severely impact performance
-- MySQL max_allowed_packet setting must be increased to handle large files

