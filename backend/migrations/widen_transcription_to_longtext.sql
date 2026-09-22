-- Meeting transcriptions from long audio exceed MySQL TEXT (65,535 bytes).
ALTER TABLE `meetings`
  MODIFY COLUMN `transcription` LONGTEXT
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;
