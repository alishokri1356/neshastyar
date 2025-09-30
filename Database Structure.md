# Database Structure - Modiryar

## Database Information
- **Host**: 195.248.240.30
- **Database**: modiryar
- **User**: modiryar_app
- **Port**: 3306

## Tables Overview
Total Tables: 5

## ⚠️ **IMPORTANT: Email Verification Migration Required**

The `users` table requires additional fields for email verification functionality. Run the following SQL migration:

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
| email_verified | boolean | YES |  | FALSE |  |
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
  `email_verified` boolean DEFAULT FALSE,
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

### Email Verification Fields Description

- **`email_verified`**: Boolean flag indicating if the user's email has been verified
- **`email_verification_token`**: Cryptographically secure token sent via email for verification
- **`email_verification_expires`**: Timestamp when the verification token expires (24 hours)
- **`password_reset_token`**: Token for password reset functionality
- **`password_reset_expires`**: Timestamp when the password reset token expires (1 hour)

### Security Notes

- **Email verification is mandatory**: Users cannot access the application without verifying their email
- **Token expiration**: All tokens have expiration times for security
- **Indexed tokens**: Verification and reset tokens are indexed for fast lookups
- **NULL handling**: Tokens are set to NULL after successful verification/reset

---

## API Endpoints Reference

### Authentication Endpoints
- `POST /api/auth/login` - User login (requires email verification)
- `POST /api/auth/signup` - User registration (sends verification email)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify` - Verify JWT token

### Email Management Endpoints
- `GET /api/auth/verify-email?token=xxx` - Verify email with token
- `POST /api/auth/resend-verification-email` - Resend verification email
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Protected Endpoints (Require Email Verification)
All endpoints below require:
1. Valid JWT token
2. Verified email address (`email_verified = true`)

#### Meetings
- `GET /api/meetings` - Get user's meetings
- `GET /api/meetings/untagged` - Get untagged meetings
- `GET /api/meetings/:id` - Get specific meeting
- `POST /api/meetings` - Create new meeting
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

#### Tags
- `GET /api/tags` - Get user's tags
- `GET /api/tags/:id` - Get specific tag
- `POST /api/tags` - Create new tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag

#### Meeting Tags
- `GET /api/meeting-tags` - Get meeting-tag relationships
- `POST /api/meeting-tags` - Create meeting-tag relationship
- `DELETE /api/meeting-tags` - Remove meeting-tag relationship

## Security Implementation

### Email Verification Flow
1. **Registration**: User registers → `email_verified = false` → Verification email sent
2. **Email Verification**: User clicks link → Token validated → `email_verified = true`
3. **Login**: User can only login if `email_verified = true`
4. **API Access**: All protected routes check `email_verified` status

### Token Management
- **Verification Tokens**: 24-hour expiration, cryptographically secure
- **Reset Tokens**: 1-hour expiration, cryptographically secure
- **JWT Tokens**: 7-day expiration, signed with secret key
- **Token Cleanup**: Tokens set to NULL after successful use

### Database Security
- **Password Hashing**: bcrypt with salt rounds
- **Indexed Tokens**: Fast token lookups for verification
- **Foreign Key Constraints**: Data integrity maintained
- **Cascade Deletes**: Related data cleaned up on user deletion

---

