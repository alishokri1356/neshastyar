# Database Structure - Modiryar

## Database Information
- **Host**: 195.248.240.30
- **Database**: modiryar
- **User**: modiryar_app
- **Port**: 3306

## Tables Overview
Total Tables: 6

## Table: `audio_files`

**Row Count**: 18

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
| id | varchar(36) | NO | PRI | NULL |  |
| meeting_id | varchar(36) | NO | MUL | NULL |  |
| file_name | varchar(255) | NO |  | NULL |  |
| file_path | varchar(500) | NO |  | NULL |  |
| file_size | bigint | YES |  | NULL |  |
| duration | int | YES |  | 0 |  |
| format | varchar(50) | YES |  | NULL |  |
| storage_type | enum('local','s3','supabase','other') | YES |  | local |  |
| upload_order | int | YES | MUL | 1 |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

### Indexes

- **PRIMARY** (UNIQUE): id
- **idx_meeting_id** (INDEX): meeting_id
- **idx_upload_order** (INDEX): upload_order

### Foreign Keys

- **fk_audio_files_meeting**: `meeting_id` → `meetings`.`id`

### CREATE TABLE Statement

```sql
CREATE TABLE `audio_files` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `meeting_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `duration` int DEFAULT '0',
  `format` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_type` enum('local','s3','supabase','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'local',    
  `upload_order` int DEFAULT '1' COMMENT 'Order of upload for this meeting',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_meeting_id` (`meeting_id`),
  KEY `idx_upload_order` (`upload_order`),
  CONSTRAINT `fk_audio_files_meeting` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

## Table: `meeting_tags`

**Row Count**: 11

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
| id | varchar(36) | NO | PRI | NULL |  |
| meeting_id | varchar(36) | NO | MUL | NULL |  |
| tag_id | varchar(36) | NO | MUL | NULL |  |

### Indexes

- **PRIMARY** (UNIQUE): id
- **unique_meeting_tag** (UNIQUE): meeting_id, tag_id
- **idx_meeting_id** (INDEX): meeting_id
- **idx_tag_id** (INDEX): tag_id

### Foreign Keys

- **fk_meeting_tags_meeting**: `meeting_id` → `meetings`.`id`
- **fk_meeting_tags_tag**: `tag_id` → `tags`.`id`

### CREATE TABLE Statement

```sql
CREATE TABLE `meeting_tags` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meeting_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_meeting_tag` (`meeting_id`,`tag_id`),
  KEY `idx_meeting_id` (`meeting_id`),
  KEY `idx_tag_id` (`tag_id`),
  CONSTRAINT `fk_meeting_tags_meeting` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_meeting_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

## Table: `meetings`

**Row Count**: 11

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
| id | varchar(36) | NO | PRI | NULL |  |
| created_at | timestamp | YES | MUL | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| meeting_date | timestamp | YES | MUL | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| status | varchar(50) | YES | MUL | pending |  |
| transcription | text | YES |  | NULL |  |
| summary | text | YES |  | NULL |  |
| people | text | YES |  | NULL |  |
| bullets | text | YES |  | NULL |  |
| tags | text | YES |  | NULL |  |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| user_id | varchar(36) | NO | MUL | NULL |  |
| title | varchar(255) | YES | MUL | NULL |  |
| html | text | YES |  | NULL |  |
| details | text | YES |  | NULL |  |
| lastTimeEmailSent | datetime | YES | MUL | NULL |  |
| CommentText | text | YES |  | NULL |  |

### Indexes

- **PRIMARY** (UNIQUE): id
- **idx_user_id** (INDEX): user_id
- **idx_status** (INDEX): status
- **idx_meeting_date** (INDEX): meeting_date
- **idx_created_at** (INDEX): created_at
- **idx_title** (INDEX): title
- **idx_meetings_last_email_sent** (INDEX): lastTimeEmailSent

### CREATE TABLE Statement

```sql
CREATE TABLE `meetings` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `meeting_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `transcription` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `summary` text COLLATE utf8mb4_unicode_ci,
  `people` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `bullets` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tags` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `html` text COLLATE utf8mb4_unicode_ci,
  `details` text COLLATE utf8mb4_unicode_ci,
  `lastTimeEmailSent` datetime DEFAULT NULL,
  `CommentText` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_meeting_date` (`meeting_date`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_title` (`title`),
  KEY `idx_meetings_last_email_sent` (`lastTimeEmailSent`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

## Table: `sessions`

**Row Count**: 0

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
| id | varchar(36) | NO | PRI | NULL |  |
| user_id | varchar(36) | NO | MUL | NULL |  |
| expires_at | timestamp | NO | MUL | NULL |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### Indexes

- **PRIMARY** (UNIQUE): id
- **idx_user_id** (INDEX): user_id
- **idx_expires_at** (INDEX): expires_at

### Foreign Keys

- **fk_sessions_user**: `user_id` → `users`.`id`

### CREATE TABLE Statement

```sql
CREATE TABLE `sessions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

## Table: `tags`

**Row Count**: 20

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
| id | varchar(36) | NO | PRI | NULL |  |
| name | varchar(255) | NO |  | NULL |  |
| color | varchar(50) | YES |  | NULL |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| user_id | varchar(36) | NO | MUL | NULL |  |

### Indexes

- **PRIMARY** (UNIQUE): id
- **unique_user_tag** (UNIQUE): user_id, name
- **idx_user_id** (INDEX): user_id

### CREATE TABLE Statement

```sql
CREATE TABLE `tags` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_tag` (`user_id`,`name`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

## Table: `users`

**Row Count**: 3

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
| id | varchar(36) | NO | PRI | NULL |  |
| email | varchar(255) | NO | UNI | NULL |  |
| password_hash | varchar(255) | NO |  | NULL |  |
| name | varchar(255) | YES |  | NULL |  |
| email_verified | tinyint(1) | YES |  | 0 |  |
| email_verification_token | varchar(255) | YES | MUL | NULL |  |
| email_verification_expires | timestamp | YES |  | NULL |  |
| password_reset_token | varchar(255) | YES | MUL | NULL |  |
| password_reset_expires | timestamp | YES |  | NULL |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

### Indexes

- **PRIMARY** (UNIQUE): id
- **email** (UNIQUE): email
- **idx_email** (INDEX): email
- **idx_email_verification_token** (INDEX): email_verification_token
- **idx_password_reset_token** (INDEX): password_reset_token

### CREATE TABLE Statement

```sql
CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT '0',
  `email_verification_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verification_expires` timestamp NULL DEFAULT NULL,
  `password_reset_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_reset_expires` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_email_verification_token` (`email_verification_token`),
  KEY `idx_password_reset_token` (`password_reset_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---