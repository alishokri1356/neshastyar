const db = require('../config/database');
const authService = require('./authService');
const participantService = require('./participantService');
const { removeNamesFromMeetingSuggestions } = require('../utils/participantUtils');

class MeetingParticipantService {
  async removeParticipantsFromSuggestions(meetingId, userId, names) {
    const meetings = await db.query(
      'SELECT summary, people FROM meetings WHERE id = ? AND user_id = ?',
      [meetingId, userId]
    );

    if (meetings.length === 0) {
      return;
    }

    const meeting = meetings[0];
    const { updatedSummary, updatedPeople, changed } = removeNamesFromMeetingSuggestions(
      meeting,
      names,
      { updateParticipantKeys: true, updateTagKeys: false }
    );

    if (!changed) {
      return;
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
    const participantSql = 'SELECT id, name FROM participants WHERE id = ? AND user_id = ?';

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

    await this.removeParticipantsFromSuggestions(meetingId, userId, [participants[0].name]);

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
    return true;
  }

  async removeParticipantFromMeetingById(userId, id) {
    const sql = `
      DELETE mp FROM meeting_participants mp
      INNER JOIN meetings m ON mp.meeting_id = m.id
      WHERE mp.id = ? AND m.user_id = ?
    `;

    await db.query(sql, [id, userId]);
    return true;
  }
}

module.exports = new MeetingParticipantService();
