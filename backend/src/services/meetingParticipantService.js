const db = require('../config/database');
const authService = require('./authService');
const participantService = require('./participantService');
const {
  PARTICIPANT_SUMMARY_KEYS,
  safeJsonParse,
  extractParticipantsFromMeeting,
} = require('../utils/participantUtils');

class MeetingParticipantService {
  async syncSummaryFromMeetingParticipants(meetingId, userId) {
    const participantRows = await this.getParticipantsForMeeting(meetingId, userId);
    const names = participantRows.map((p) => p.name);

    const meetings = await db.query(
      'SELECT summary, people FROM meetings WHERE id = ? AND user_id = ?',
      [meetingId, userId]
    );

    if (meetings.length === 0) {
      return;
    }

    const meeting = meetings[0];
    let updatedSummary = meeting.summary ?? null;
    const updatedPeople = names.length > 0 ? JSON.stringify(names) : null;

    if (meeting.summary) {
      const summaryData = safeJsonParse(meeting.summary);
      if (summaryData && typeof summaryData === 'object') {
        let hasParticipantKey = false;
        PARTICIPANT_SUMMARY_KEYS.forEach((key) => {
          if (Array.isArray(summaryData[key])) {
            summaryData[key] = names;
            hasParticipantKey = true;
          }
        });

        if (!hasParticipantKey && names.length > 0) {
          summaryData['People in meetings'] = names;
        }

        updatedSummary = JSON.stringify(summaryData);
      }
    } else if (names.length > 0) {
      updatedSummary = JSON.stringify({ 'People in meetings': names });
    }

    await db.query(
      'UPDATE meetings SET people = ?, summary = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [updatedPeople, updatedSummary, meetingId, userId]
    );
  }

  async getParticipantsForMeeting(meetingId, userId) {
    const sql = `
      SELECT p.*
      FROM participants p
      INNER JOIN meeting_participants mp ON p.id = mp.participant_id
      INNER JOIN meetings m ON mp.meeting_id = m.id
      WHERE m.id = ? AND m.user_id = ?
      ORDER BY p.name ASC
    `;

    return await db.query(sql, [meetingId, userId]);
  }

  async addParticipantToMeeting(userId, meetingId, participantId) {
    const meetingSql = 'SELECT id FROM meetings WHERE id = ? AND user_id = ?';
    const participantSql = 'SELECT id FROM participants WHERE id = ? AND user_id = ?';

    const meetings = await db.query(meetingSql, [meetingId, userId]);
    const participants = await db.query(participantSql, [participantId, userId]);

    if (meetings.length === 0) {
      throw new Error('Meeting not found or access denied');
    }

    if (participants.length === 0) {
      throw new Error('Participant not found or access denied');
    }

    const existing = await db.query(
      'SELECT id FROM meeting_participants WHERE meeting_id = ? AND participant_id = ?',
      [meetingId, participantId]
    );

    if (existing.length > 0) {
      throw new Error('Meeting-participant relationship already exists');
    }

    const id = authService.generateId();
    await db.query(
      'INSERT INTO meeting_participants (id, meeting_id, participant_id) VALUES (?, ?, ?)',
      [id, meetingId, participantId]
    );

    await this.syncSummaryFromMeetingParticipants(meetingId, userId);

    return { id, meeting_id: meetingId, participant_id: participantId };
  }

  async addParticipantByNameToMeeting(userId, meetingId, name) {
    const participant = await participantService.upsertParticipantByName(userId, name);
    if (!participant) {
      throw new Error('Participant name is required');
    }

    const existing = await db.query(
      'SELECT id FROM meeting_participants WHERE meeting_id = ? AND participant_id = ?',
      [meetingId, participant.id]
    );

    if (existing.length > 0) {
      throw new Error('Meeting-participant relationship already exists');
    }

    return await this.addParticipantToMeeting(userId, meetingId, participant.id);
  }

  async removeParticipantFromMeeting(userId, meetingId, participantId) {
    const sql = `
      DELETE mp FROM meeting_participants mp
      INNER JOIN meetings m ON mp.meeting_id = m.id
      WHERE mp.meeting_id = ? AND mp.participant_id = ? AND m.user_id = ?
    `;

    await db.query(sql, [meetingId, participantId, userId]);
    await this.syncSummaryFromMeetingParticipants(meetingId, userId);
    return true;
  }

  async removeParticipantFromMeetingById(userId, id) {
    const rows = await db.query(
      `
        SELECT mp.meeting_id
        FROM meeting_participants mp
        INNER JOIN meetings m ON mp.meeting_id = m.id
        WHERE mp.id = ? AND m.user_id = ?
      `,
      [id, userId]
    );

    const meetingId = rows[0]?.meeting_id;

    const sql = `
      DELETE mp FROM meeting_participants mp
      INNER JOIN meetings m ON mp.meeting_id = m.id
      WHERE mp.id = ? AND m.user_id = ?
    `;

    await db.query(sql, [id, userId]);

    if (meetingId) {
      await this.syncSummaryFromMeetingParticipants(meetingId, userId);
    }

    return true;
  }

  async syncParticipantsFromSummary(meetingId, userId) {
    const meetings = await db.query(
      'SELECT id, summary, people FROM meetings WHERE id = ? AND user_id = ?',
      [meetingId, userId]
    );

    if (meetings.length === 0) {
      throw new Error('Meeting not found or access denied');
    }

    const meeting = meetings[0];
    const extractedNames = extractParticipantsFromMeeting(meeting);
    const desiredParticipantIds = new Set();

    for (const name of extractedNames) {
      const participant = await participantService.upsertParticipantByName(userId, name);
      if (participant) {
        desiredParticipantIds.add(participant.id);
      }
    }

    const currentRows = await db.query(
      `
        SELECT mp.id, mp.participant_id
        FROM meeting_participants mp
        INNER JOIN meetings m ON mp.meeting_id = m.id
        WHERE mp.meeting_id = ? AND m.user_id = ?
      `,
      [meetingId, userId]
    );

    const currentParticipantIds = new Set(
      (currentRows || []).map((row) => row.participant_id)
    );

    for (const participantId of desiredParticipantIds) {
      if (!currentParticipantIds.has(participantId)) {
        const id = authService.generateId();
        await db.query(
          'INSERT INTO meeting_participants (id, meeting_id, participant_id) VALUES (?, ?, ?)',
          [id, meetingId, participantId]
        );
      }
    }

    for (const row of currentRows || []) {
      if (!desiredParticipantIds.has(row.participant_id)) {
        await db.query('DELETE FROM meeting_participants WHERE id = ?', [row.id]);
      }
    }

    return {
      meetingId,
      participantCount: desiredParticipantIds.size,
    };
  }
}

module.exports = new MeetingParticipantService();
