const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
require('dotenv').config();

const { extractParticipantsFromMeeting } = require('../src/utils/participantUtils');

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'modiryar',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
}

async function tablesExist(connection) {
  const [rows] = await connection.query(
    `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('participants', 'meeting_participants')
    `
  );

  const found = new Set(rows.map((row) => row.TABLE_NAME));
  return {
    participants: found.has('participants'),
    meetingParticipants: found.has('meeting_participants'),
    ready: found.has('participants') && found.has('meeting_participants'),
  };
}

async function runSchemaMigration(connection) {
  const migrationPath = path.join(__dirname, 'add_participants_tables.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  const statements = migrationSQL.split(';').filter((stmt) => stmt.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      console.log(`Executing schema: ${statement.trim().substring(0, 60)}...`);
      await connection.execute(statement);
    }
  }
}

async function upsertParticipant(connection, userId, name, participantCache) {
  const cacheKey = `${userId}::${name.toLowerCase()}`;
  if (participantCache.has(cacheKey)) {
    return participantCache.get(cacheKey);
  }

  const [existing] = await connection.query(
    'SELECT id, name FROM participants WHERE user_id = ? AND name = ? LIMIT 1',
    [userId, name]
  );

  if (existing.length > 0) {
    participantCache.set(cacheKey, existing[0]);
    return existing[0];
  }

  const id = randomUUID();
  await connection.query(
    'INSERT INTO participants (id, user_id, name) VALUES (?, ?, ?)',
    [id, userId, name]
  );

  const participant = { id, name };
  participantCache.set(cacheKey, participant);
  return participant;
}

async function ensureMeetingParticipant(connection, meetingId, participantId) {
  const [existing] = await connection.query(
    'SELECT id FROM meeting_participants WHERE meeting_id = ? AND participant_id = ? LIMIT 1',
    [meetingId, participantId]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const id = randomUUID();
  await connection.query(
    'INSERT INTO meeting_participants (id, meeting_id, participant_id) VALUES (?, ?, ?)',
    [id, meetingId, participantId]
  );
  return id;
}

async function migrateParticipantsData(connection) {
  console.log('Migrating participants from meetings...');

  const [users] = await connection.query('SELECT id FROM users');
  const participantCache = new Map();
  const allPersonNamesByUser = new Map();

  for (const user of users) {
    const userId = user.id;
    allPersonNamesByUser.set(userId, new Set());

    const [meetings] = await connection.query(
      'SELECT id, summary, people FROM meetings WHERE user_id = ?',
      [userId]
    );

    for (const meeting of meetings) {
      const names = extractParticipantsFromMeeting(meeting);

      for (const name of names) {
        allPersonNamesByUser.get(userId).add(name.toLowerCase().trim());

        const participant = await upsertParticipant(connection, userId, name, participantCache);
        await ensureMeetingParticipant(connection, meeting.id, participant.id);
      }
    }
  }

  console.log('Migrating person-tags to participants...');

  for (const user of users) {
    const userId = user.id;
    const personNames = allPersonNamesByUser.get(userId) || new Set();

    if (personNames.size === 0) {
      continue;
    }

    const [tags] = await connection.query('SELECT id, name FROM tags WHERE user_id = ?', [userId]);

    for (const tag of tags) {
      const normalizedTagName = tag.name.toLowerCase().trim();
      if (!personNames.has(normalizedTagName)) {
        continue;
      }

      console.log(`  Moving tag "${tag.name}" (user ${userId}) to participants`);

      const [meetingTags] = await connection.query(
        'SELECT id, meeting_id FROM meeting_tags WHERE tag_id = ?',
        [tag.id]
      );

      const participant = await upsertParticipant(connection, userId, tag.name.trim(), participantCache);

      for (const meetingTag of meetingTags) {
        await ensureMeetingParticipant(connection, meetingTag.meeting_id, participant.id);
        await connection.query('DELETE FROM meeting_tags WHERE id = ?', [meetingTag.id]);
      }

      const [remainingUsage] = await connection.query(
        'SELECT COUNT(*) AS count FROM meeting_tags WHERE tag_id = ?',
        [tag.id]
      );

      if (Number(remainingUsage[0]?.count ?? 0) === 0) {
        await connection.query('DELETE FROM tags WHERE id = ? AND user_id = ?', [tag.id, userId]);
      }
    }
  }
}

async function runParticipantsMigration() {
  let connection;
  const dataOnly = process.argv.includes('--data-only');

  try {
    console.log('Starting participants migration...');
    connection = await getConnection();
    console.log('Connected to database');

    const tableStatus = await tablesExist(connection);

    if (!tableStatus.ready) {
      if (dataOnly) {
        throw new Error(
          'Tables participants and/or meeting_participants do not exist. ' +
            'Create them first in phpMyAdmin using add_participants_tables.sql'
        );
      }

      console.log('Participant tables not found — attempting schema migration...');
      try {
        await runSchemaMigration(connection);
      } catch (schemaError) {
        if (schemaError.code === 'ER_TABLEACCESS_DENIED_ERROR') {
          throw new Error(
            'Cannot CREATE tables with modiryar_app user. ' +
              'Run add_participants_tables.sql manually in phpMyAdmin (admin), then rerun:\n' +
              '  node migrations/migrate_participants_and_cleanup_tags.js --data-only'
          );
        }
        throw schemaError;
      }
    } else {
      console.log('Participant tables already exist — skipping schema migration.');
    }

    await connection.beginTransaction();
    await migrateParticipantsData(connection);
    await connection.commit();

    console.log('Participants migration completed successfully');
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback errors
      }
    }
    console.error('Migration failed:', error.message || error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runParticipantsMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
