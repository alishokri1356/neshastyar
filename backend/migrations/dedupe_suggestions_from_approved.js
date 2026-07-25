const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { removeNamesFromMeetingSuggestions } = require('../src/utils/participantUtils');

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

async function dedupeSuggestionsFromApproved() {
  const connection = await getConnection();

  try {
    const [meetings] = await connection.query(
      'SELECT id, user_id, summary, people FROM meetings'
    );

    let updatedMeetings = 0;

    for (const meeting of meetings) {
      const [participantRows] = await connection.query(
        `
          SELECT p.name
          FROM participants p
          INNER JOIN meeting_participants mp ON p.id = mp.participant_id
          WHERE mp.meeting_id = ?
        `,
        [meeting.id]
      );

      const [tagRows] = await connection.query(
        `
          SELECT t.name
          FROM tags t
          INNER JOIN meeting_tags mt ON t.id = mt.tag_id
          WHERE mt.meeting_id = ?
        `,
        [meeting.id]
      );

      const participantNames = participantRows.map((row) => row.name);
      const tagNames = tagRows.map((row) => row.name);

      let updatedSummary = meeting.summary;
      let updatedPeople = meeting.people;
      let changed = false;

      if (participantNames.length > 0) {
        const participantResult = removeNamesFromMeetingSuggestions(
          { summary: updatedSummary, people: updatedPeople },
          participantNames,
          { updateParticipantKeys: true, updateTagKeys: false }
        );

        if (participantResult.changed) {
          updatedSummary = participantResult.updatedSummary;
          updatedPeople = participantResult.updatedPeople;
          changed = true;
        }
      }

      if (tagNames.length > 0) {
        const tagResult = removeNamesFromMeetingSuggestions(
          { summary: updatedSummary, people: updatedPeople },
          tagNames,
          { updateParticipantKeys: false, updateTagKeys: true }
        );

        if (tagResult.changed) {
          updatedSummary = tagResult.updatedSummary;
          updatedPeople = tagResult.updatedPeople;
          changed = true;
        }
      }

      if (changed) {
        await connection.query(
          'UPDATE meetings SET summary = ?, people = ?, updated_at = NOW() WHERE id = ?',
          [updatedSummary, updatedPeople, meeting.id]
        );
        updatedMeetings += 1;
        console.log(`Updated meeting ${meeting.id}`);
      }
    }

    console.log(`Done. Updated ${updatedMeetings} of ${meetings.length} meetings.`);
  } finally {
    await connection.end();
  }
}

dedupeSuggestionsFromApproved().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
