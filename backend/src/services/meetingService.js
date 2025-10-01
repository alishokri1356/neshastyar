const db = require('../config/database');
const authService = require('./authService');

// Helper function to convert ISO datetime to MySQL format
function toMySQLDateTime(date) {
  if (!date) return null;
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  // Format: YYYY-MM-DD HH:MM:SS
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

class MeetingService {
  // Get meetings for a user
  async getMeetings(userId, options = {}) {
    let sql = 'SELECT * FROM meetings WHERE user_id = ?';
    const params = [userId];

    // Add filtering options
    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    // Add ORDER BY clause (must come before LIMIT)
    if (options.orderBy) {
      const direction = options.orderDirection || 'DESC';
      sql += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    // Add LIMIT clause (must come after ORDER BY)
    if (options.limit) {
      sql += ' LIMIT ?';
      const limitValue = parseInt(options.limit);
      params.push(limitValue);
    }

    return await db.query(sql, params);
  }

  // Get meeting by ID
  async getMeetingById(id, userId) {
    const sql = 'SELECT * FROM meetings WHERE id = ? AND user_id = ?';
    const meetings = await db.query(sql, [id, userId]);
    return meetings[0] || null;
  }

  // Create new meeting
  async createMeeting(userId, meetingData) {
    const id = authService.generateId();
    const now = new Date();

    const sql = `
      INSERT INTO meetings (
        id, user_id, audio_file_name, audio_file_path, 
        audio_file_size, audio_duration, audio_format,
        title, meeting_date, status, summary, 
        storage_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Convert dates to MySQL format
    const meetingDate = meetingData.meeting_date 
      ? toMySQLDateTime(meetingData.meeting_date) 
      : toMySQLDateTime(now);
    
    const values = [
      id,
      userId,
      meetingData.audio_file_name || null,
      meetingData.audio_file_path || null,
      meetingData.audio_file_size || null,
      meetingData.audio_duration || 0,
      meetingData.audio_format || null,
      meetingData.title || null,
      meetingDate,
      meetingData.status || 'pending',
      meetingData.summary || null,
      meetingData.storage_type || 'local',
      toMySQLDateTime(now),
      toMySQLDateTime(now)
    ];

    await db.query(sql, values);
    return await this.getMeetingById(id, userId);
  }

  // Update meeting
  async updateMeeting(id, userId, updates) {
    const allowedFields = ['audio_file_name', 'meeting_date', 'status', 'summary'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = ?');
    values.push(new Date());
    values.push(id);
    values.push(userId);

    const sql = `UPDATE meetings SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
    await db.query(sql, values);

    return await this.getMeetingById(id, userId);
  }

  // Delete meeting
  async deleteMeeting(id, userId) {
    const sql = 'DELETE FROM meetings WHERE id = ? AND user_id = ?';
    await db.query(sql, [id, userId]);
    return true;
  }

  // Get meetings with tags
  async getMeetingsWithTags(userId, options = {}) {
    const sql = `
      SELECT 
        m.*,
        GROUP_CONCAT(
          CONCAT(t.id, ':', t.name, ':', COALESCE(t.color, ''))
          SEPARATOR '|'
        ) as tags
      FROM meetings m
      LEFT JOIN meeting_tags mt ON m.id = mt.meeting_id
      LEFT JOIN tags t ON mt.tag_id = t.id AND t.user_id = ?
      WHERE m.user_id = ?
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `;

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    return await db.query(sql, [userId, userId]);
  }

  // Get untagged meetings
  async getUntaggedMeetings(userId) {
    const sql = `
      SELECT m.*
      FROM meetings m
      LEFT JOIN meeting_tags mt ON m.id = mt.meeting_id
      WHERE m.user_id = ? AND mt.meeting_id IS NULL
      ORDER BY m.created_at DESC
    `;

    return await db.query(sql, [userId]);
  }
}

module.exports = new MeetingService();
