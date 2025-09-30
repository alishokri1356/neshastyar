# Database Structure - Modiryar

## Database Information
- **Host**: 195.248.240.30
- **Database**: modiryar
- **User**: modiryar_app
- **Port**: 3306

## Tables Overview
Total Tables: 5

---

## ⚠️ **IMPORTANT: Required Database Migrations**

Before deploying the application, you MUST run these SQL migrations in the following order:

### Migration 1: Email Verification (REQUIRED)

```sql
-- Add email verification fields to users table
ALTER TABLE `users` 
ADD COLUMN `email_verified` BOOLEAN DEFAULT FALSE AFTER `name`,
ADD COLUMN `email_verification_token` VARCHAR(255) NULL AFTER `email_verified`,
ADD COLUMN `email_verification_expires` TIMESTAMP NULL AFTER `email_verification_token`,
ADD COLUMN `password_reset_token` VARCHAR(255) NULL AFTER `email_verification_expires`,
ADD COLUMN `password_reset_expires` TIMESTAMP NULL AFTER `password_reset_token`;

-- Add indexes for performance
ALTER TABLE `users` 
ADD INDEX `idx_email_verification_token` (`email_verification_token`),
ADD INDEX `idx_password_reset_token` (`password_reset_token`);
```

### Migration 2: Audio File Storage (REQUIRED)

```sql
-- Add audio storage fields to meetings table
ALTER TABLE `meetings`
ADD COLUMN `audio_file_path` VARCHAR(500) NULL COMMENT 'Full path to audio file',
ADD COLUMN `audio_file_size` BIGINT NULL COMMENT 'File size in bytes',
ADD COLUMN `audio_duration` INT DEFAULT 0 COMMENT 'Audio duration in seconds',
ADD COLUMN `audio_format` VARCHAR(50) NULL COMMENT 'Audio format (mp3, wav, ogg, etc.)',
ADD COLUMN `title` VARCHAR(255) NULL COMMENT 'Meeting title',
ADD COLUMN `storage_type` ENUM('local', 's3', 'supabase', 'other') DEFAULT 'local' COMMENT 'Storage location';

-- Add indexes for better performance
CREATE INDEX `idx_audio_file_path` ON `meetings` (`audio_file_path`);
CREATE INDEX `idx_storage_type` ON `meetings` (`storage_type`);
CREATE INDEX `idx_title` ON `meetings` (`title`);
```

**How to Run:**
1. Go to phpMyAdmin: http://phpmyadmin.teraxr.com/local
2. Select database: `modiryar`
3. Click "SQL" tab
4. Copy and paste the SQL commands above
5. Click "Go" to execute

**Status**: ✅ Migrations have been applied to the database

---

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
| audio_file_path | varchar(500) | YES | MUL | NULL |  |
| audio_file_size | bigint | YES |  | NULL |  |
| audio_duration | int | YES |  | 0 |  |
| audio_format | varchar(50) | YES |  | NULL |  |
| title | varchar(255) | YES | MUL | NULL |  |
| storage_type | enum('local','s3','supabase','other') | YES | MUL | local |  |

### Indexes

- **PRIMARY** (UNIQUE): id
- **idx_user_id** (INDEX): user_id
- **idx_status** (INDEX): status
- **idx_meeting_date** (INDEX): meeting_date
- **idx_created_at** (INDEX): created_at
- **idx_audio_file_path** (INDEX): audio_file_path
- **idx_storage_type** (INDEX): storage_type
- **idx_title** (INDEX): title

### Audio File Storage Fields Description

The `meetings` table includes comprehensive audio file storage capabilities:

#### Core Fields:
- **`audio_file_name`**: Original filename as uploaded by user
- **`audio_file_path`**: Full path to audio file on server (e.g., `uploads/audio/{user_id}/{timestamp}-{filename}`)
- **`audio_file_size`**: File size in bytes (for storage management and quotas)
- **`audio_duration`**: Audio duration in seconds (for UI display)
- **`audio_format`**: MIME type of the audio file (e.g., `audio/ogg`, `audio/wav`, `audio/mp3`)
- **`title`**: Meeting title (auto-generated from filename or user-provided)
- **`storage_type`**: Storage location type:
  - `local`: Files stored on server filesystem
  - `s3`: Files stored on AWS S3
  - `supabase`: Files stored on Supabase Storage
  - `other`: Custom storage solution

#### Meeting Metadata:
- **`meeting_date`**: Timestamp when the meeting occurred
- **`status`**: Processing status (e.g., 'آماده پردازش', 'ارسال درخواست پردازش')
- **`summary`**: AI-generated meeting summary
- **`user_id`**: Owner of the meeting

#### Storage Implementation:
- **File Location**: `backend/uploads/audio/{user_id}/{timestamp}-{filename}`
- **Max File Size**: 500MB (configurable)
- **Supported Formats**: MP3, WAV, OGG, WebM, M4A
- **Security**: User-specific directories, authentication required
- **Backup**: Files should be backed up regularly (see deployment guide)

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
  `audio_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `audio_file_size` bigint DEFAULT NULL,
  `audio_duration` int DEFAULT '0',
  `audio_format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_type` enum('local','s3','supabase','other') COLLATE utf8mb4_unicode_ci DEFAULT 'local',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_meeting_date` (`meeting_date`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_audio_file_path` (`audio_file_path`),
  KEY `idx_storage_type` (`storage_type`),
  KEY `idx_title` (`title`)
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

### Email Verification Fields

- **`email_verified`**: Boolean flag indicating if email has been verified (required for app access)
- **`email_verification_token`**: Cryptographically secure token (32 bytes hex) sent via email
- **`email_verification_expires`**: Token expiration timestamp (24 hours from creation)
- **`password_reset_token`**: Token for password reset functionality
- **`password_reset_expires`**: Reset token expiration (1 hour from creation)

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

## 📡 API Endpoints Reference

### Authentication Endpoints (Public)
- `POST /api/auth/signup` - User registration (sends verification email)
- `POST /api/auth/login` - User login (requires verified email)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/verify-email?token=xxx` - Verify email with token
- `POST /api/auth/resend-verification-email` - Resend verification email
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### File Upload Endpoints (Protected - Requires Email Verification)
- `POST /api/upload/audio` - Upload audio file (multipart/form-data, max 500MB)
- `GET /api/files/audio/:userId/:filename` - Download audio file
- `DELETE /api/files/audio/:userId/:filename` - Delete audio file

### Meeting Endpoints (Protected - Requires Email Verification)
- `GET /api/meetings` - Get all user's meetings
- `GET /api/meetings/untagged` - Get untagged meetings
- `GET /api/meetings/:id` - Get specific meeting
- `POST /api/meetings` - Create new meeting with audio metadata
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

### Tag Endpoints (Protected - Requires Email Verification)
- `GET /api/tags` - Get all user's tags
- `GET /api/tags/:id` - Get specific tag
- `POST /api/tags` - Create new tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag

### Meeting-Tag Relationship Endpoints (Protected - Requires Email Verification)
- `GET /api/meeting-tags` - Get meeting-tag relationships
- `POST /api/meeting-tags` - Create relationship (link tag to meeting)
- `DELETE /api/meeting-tags` - Remove relationship

---

## 🔒 Security Implementation

### Email Verification System
- **Mandatory**: Users CANNOT use the app without verifying their email
- **Token Generation**: Cryptographically secure random tokens (32 bytes hex)
- **Expiration Times**: 
  - Email verification: 24 hours
  - Password reset: 1 hour
- **One-time Use**: Tokens are cleared (set to NULL) after successful verification

### Authentication Flow
1. **Registration**: User signs up → `email_verified = false` → Verification email sent
2. **Email Verification**: User clicks link in email → Token validated → `email_verified = true`
3. **Login Restriction**: Login is blocked until `email_verified = true`
4. **API Protection**: All protected routes check email verification status
5. **Session Management**: JWT tokens with 7-day expiration, signed with secret key

### File Storage Security
- **User Isolation**: Each user has isolated directory (`uploads/audio/{user_id}/`)
- **Access Control**: Users can ONLY access/delete their own files
- **File Validation**: 
  - Type checking (audio formats only)
  - Size limits (500MB max)
  - MIME type validation
- **Authentication**: All file operations require valid JWT token
- **Email Verification**: File uploads blocked for unverified users

### Password Security
- **Hashing**: bcrypt with automatic salt generation
- **Reset Tokens**: Cryptographically secure, 1-hour expiration
- **Token Cleanup**: Tokens set to NULL after successful password reset
- **No Password Exposure**: Passwords never returned in API responses

---

## 📊 Storage Estimates

### Database Size (Metadata Only):
- **users**: ~1KB per user
- **meetings**: ~500 bytes per meeting
- **tags**: ~200 bytes per tag
- **meeting_tags**: ~100 bytes per relationship
- **sessions**: ~200 bytes per active session

**Estimated DB Size**: <1MB for 1000 users with 100 meetings each

### File Storage (Audio Files):
- **Per Meeting**: 10-200MB (typical compressed audio)
- **Per User (10 meetings/month)**: ~500MB-1GB/month
- **100 Users**: 50-100GB/month
- **1000 Users**: 500GB-1TB/month

### Recommendations:
1. **Monitor Disk Usage**: Set up alerts when disk usage exceeds 80%
2. **Implement Cleanup**: Auto-delete meetings older than 6-12 months
3. **Backup Strategy**: Daily backups of uploads directory
4. **Consider Cloud Storage**: Migrate to AWS S3 when storage exceeds 500GB

---

## 📁 File System Structure

```
/root/modiryar/
└── backend/
    └── uploads/
        └── audio/
            ├── {user-id-1}/
            │   ├── 1696123456789-meeting1.ogg
            │   ├── 1696234567890-meeting2.wav
            │   └── ...
            ├── {user-id-2}/
            │   └── ...
            └── ...
```

---

## 🔗 Related Documentation

- **Deployment Guide**: `DEPLOYMENT_GUIDE_VPS.md` - Complete deployment instructions
- **Setup Guide**: `SETUP_VPS.md` - Initial VPS setup
- **Quick Start**: `QUICK_START.md` - Quick reference
- **Audio Storage**: `backend/AUDIO_STORAGE_GUIDE.md` - Technical details
- **README**: `README.md` - Project overview

---

**Last Updated**: September 30, 2025  
**Migration Status**: ✅ Audio storage fields added  
**Version**: 2.0 (with audio file storage)

