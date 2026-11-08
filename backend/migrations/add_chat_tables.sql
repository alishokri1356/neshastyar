CREATE TABLE IF NOT EXISTS chat_sessions (
  id varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  meeting_id varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  scope enum('meeting','all') COLLATE utf8mb4_unicode_ci NOT NULL,
  title varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  last_message_at timestamp NULL DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_sessions_user_scope_last (user_id, scope, last_message_at),
  KEY idx_chat_sessions_meeting_id (meeting_id),
  CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_sessions_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  session_id varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  role enum('user','assistant') COLLATE utf8mb4_unicode_ci NOT NULL,
  content mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  model_used varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  status enum('ok','error') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ok',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_messages_session_created (session_id, created_at),
  CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
