const db = require('../config/database');
const authService = require('./authService');

class MeetingTagService {
  // Get meeting-tag relationships
  async getMeetingTags(userId, options = {}) {
    let sql = 'SELECT * FROM meeting_tags WHERE 1=1';
    const params = [];

    if (options.meeting_id) {
      sql += ' AND meeting_id = ?';
      params.push(options.meeting_id);
    }

    if (options.tag_id) {
      sql += ' AND tag_id = ?';
      params.push(options.tag_id);
    }

    console.log('🔍 Meeting tags SQL:', sql, 'params:', params);
    return await db.query(sql, params);
  }

  // Create meeting-tag relationship
  async createMeetingTag(userId, meetingId, tagId) {
    // Verify that both meeting and tag belong to the user
    const meetingSql = 'SELECT id FROM meetings WHERE id = ? AND user_id = ?';
    const tagSql = 'SELECT id FROM tags WHERE id = ? AND user_id = ?';
    
    const meetings = await db.query(meetingSql, [meetingId, userId]);
    const tags = await db.query(tagSql, [tagId, userId]);

    if (meetings.length === 0) {
      throw new Error('Meeting not found or access denied');
    }

    if (tags.length === 0) {
      throw new Error('Tag not found or access denied');
    }

    // Check if relationship already exists
    const existingSql = 'SELECT id FROM meeting_tags WHERE meeting_id = ? AND tag_id = ?';
    const existing = await db.query(existingSql, [meetingId, tagId]);

    if (existing.length > 0) {
      throw new Error('Meeting-tag relationship already exists');
    }

    const id = authService.generateId();
    const sql = 'INSERT INTO meeting_tags (id, meeting_id, tag_id) VALUES (?, ?, ?)';
    
    await db.query(sql, [id, meetingId, tagId]);
    
    return {
      id,
      meeting_id: meetingId,
      tag_id: tagId
    };
  }

  // Delete meeting-tag relationship
  async deleteMeetingTag(userId, meetingId, tagId) {
    const sql = `
      DELETE mt FROM meeting_tags mt
      INNER JOIN meetings m ON mt.meeting_id = m.id
      WHERE mt.meeting_id = ? AND mt.tag_id = ? AND m.user_id = ?
    `;

    await db.query(sql, [meetingId, tagId, userId]);
    return true;
  }

  // Delete meeting-tag relationship by ID
  async deleteMeetingTagById(userId, id) {
    const sql = `
      DELETE mt FROM meeting_tags mt
      INNER JOIN meetings m ON mt.meeting_id = m.id
      WHERE mt.id = ? AND m.user_id = ?
    `;

    await db.query(sql, [id, userId]);
    return true;
  }

  // Get tags for a specific meeting
  async getTagsForMeeting(meetingId, userId) {
    const sql = `
      SELECT t.*
      FROM tags t
      INNER JOIN meeting_tags mt ON t.id = mt.tag_id
      INNER JOIN meetings m ON mt.meeting_id = m.id
      WHERE m.id = ? AND m.user_id = ?
    `;

    return await db.query(sql, [meetingId, userId]);
  }

  // Get meetings for a specific tag
  async getMeetingsForTag(tagId, userId) {
    const sql = `
      SELECT m.*
      FROM meetings m
      INNER JOIN meeting_tags mt ON m.id = mt.meeting_id
      INNER JOIN tags t ON mt.tag_id = t.id
      WHERE t.id = ? AND t.user_id = ?
    `;

    return await db.query(sql, [tagId, userId]);
  }
}

module.exports = new MeetingTagService();
