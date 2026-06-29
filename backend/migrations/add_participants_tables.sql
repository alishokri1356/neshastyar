CREATE TABLE IF NOT EXISTS participants (
  id varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  name varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_participant (user_id, name),
  KEY idx_participants_user_id (user_id),
  CONSTRAINT fk_participants_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meeting_participants (
  id varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  meeting_id varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  participant_id varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_meeting_participant (meeting_id, participant_id),
  KEY idx_meeting_participants_meeting_id (meeting_id),
  KEY idx_meeting_participants_participant_id (participant_id),
  CONSTRAINT fk_mp_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
  CONSTRAINT fk_mp_participant FOREIGN KEY (participant_id) REFERENCES participants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
