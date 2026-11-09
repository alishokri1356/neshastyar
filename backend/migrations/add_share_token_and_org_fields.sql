-- Public meeting-report link and per-user organization branding

ALTER TABLE `meetings`
  ADD COLUMN `share_token` VARCHAR(64) NULL AFTER `analyzed_by`,
  ADD COLUMN `share_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `share_token`,
  ADD UNIQUE INDEX `idx_meetings_share_token` (`share_token`);

ALTER TABLE `users`
  ADD COLUMN `org_name` VARCHAR(255) NULL AFTER `default_analyze_model`,
  ADD COLUMN `org_logo_path` VARCHAR(255) NULL AFTER `org_name`;
