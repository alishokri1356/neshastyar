# Database Structure - Modiryar

## Database Information
- **Host**: 195.248.240.30
- **Database**: modiryar
- **User**: modiryar_app
- **Port**: 3306

## Tables Overview
Total Tables: 5

## Table: `meeting_tags`

**Row Count**: 0

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

**Row Count**: 0

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
| id | varchar(36) | NO | PRI | NULL |  |
| audio_file_name | varchar(255) | YES |  | NULL |  |
| created_at | timestamp | YES | MUL | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| meeting_date | timestamp | YES | MUL | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| status | varchar(50) | YES | MUL | pending |  |
| summary | text | YES |  | NULL |  |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| user_id | varchar(36) | NO | MUL | NULL |  |

### Indexes

- **PRIMARY** (UNIQUE): id
- **idx_user_id** (INDEX): user_id
- **idx_status** (INDEX): status
- **idx_meeting_date** (INDEX): meeting_date
- **idx_created_at** (INDEX): created_at

### CREATE TABLE Statement

```sql
CREATE TABLE `meetings` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `audio_file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `meeting_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `summary` text COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_meeting_date` (`meeting_date`),
  KEY `idx_created_at` (`created_at`)
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

**Row Count**: 0

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
| id | varchar(36) | NO | PRI | NULL |  |
| name | varchar(255) | NO |  | NULL |  |
| color | varchar(50) | YES |  | NULL |  |
| created_at | timestamp | YES | MUL | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| user_id | varchar(36) | NO | MUL | NULL |  |

### Indexes

- **PRIMARY** (UNIQUE): id
- **idx_user_id** (INDEX): user_id
- **idx_created_at** (INDEX): created_at

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
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

## Table: `users`

**Row Count**: 0

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
| id | varchar(36) | NO | PRI | NULL |  |
| email | varchar(255) | NO | UNI | NULL |  |
| password_hash | varchar(255) | NO |  | NULL |  |
| name | varchar(255) | YES |  | NULL |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

### Indexes

- **PRIMARY** (UNIQUE): id
- **email** (UNIQUE): email
- **idx_email** (INDEX): email

### CREATE TABLE Statement

```sql
CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

