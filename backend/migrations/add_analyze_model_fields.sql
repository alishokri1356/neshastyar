-- Multi-model analyze fields for Neshastyar V4

ALTER TABLE `meetings`
  ADD COLUMN `analyze_model` VARCHAR(50) NULL AFTER `CommentText`,
  ADD COLUMN `analyzing_model` VARCHAR(50) NULL AFTER `analyze_model`,
  ADD COLUMN `analyzed_by` VARCHAR(50) NULL AFTER `analyzing_model`;

ALTER TABLE `users`
  ADD COLUMN `default_analyze_model` VARCHAR(50) NULL AFTER `baleID`;
