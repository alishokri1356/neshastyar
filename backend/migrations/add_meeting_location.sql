-- Meeting place extracted from the analysis, when the transcript states one.
ALTER TABLE `meetings`
  ADD COLUMN `location` VARCHAR(500) NULL AFTER `title`;
