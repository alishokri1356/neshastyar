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
        id, user_id, title, meeting_date, status, summary, CommentText,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Convert dates to MySQL format
    const meetingDate = meetingData.meeting_date 
      ? toMySQLDateTime(meetingData.meeting_date) 
      : toMySQLDateTime(now);
    
    const values = [
      id,
      userId,
      meetingData.title || null,
      meetingDate,
      meetingData.status || 'pending',
      meetingData.summary || null,
      meetingData.CommentText || null,
      toMySQLDateTime(now),
      toMySQLDateTime(now)
    ];

    await db.query(sql, values);
    return await this.getMeetingById(id, userId);
  }

  // Update meeting
  async updateMeeting(id, userId, updates) {
    const allowedFields = ['title', 'meeting_date', 'status', 'summary', 'CommentText'];
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

  // Rename a participant across all meetings for a user
  async renameParticipant(userId, oldName, newName) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const trimmedOldName = (oldName ?? '').trim();
    const trimmedNewName = (newName ?? '').trim();

    if (!trimmedOldName || !trimmedNewName) {
      throw new Error('Both old and new participant names are required');
    }

    if (trimmedOldName === trimmedNewName) {
      return { updatedMeetings: 0 };
    }

    const meetings = await db.query(
      'SELECT id, summary, people FROM meetings WHERE user_id = ?',
      [userId]
    );

    let updatedCount = 0;

    const replaceNamesInArray = (list) => {
      let changed = false;
      const updatedList = list.map((name) => {
        if (typeof name === 'string' && name.trim() === trimmedOldName) {
          changed = true;
          return trimmedNewName;
        }
        return name;
      });
      return { changed, updatedList };
    };

    for (const meeting of meetings) {
      let hasChanges = false;
      let updatedPeople = meeting.people ?? null;
      let updatedSummary = meeting.summary ?? null;

      if (meeting.people) {
        let peopleChanged = false;

        try {
          const parsedPeople = JSON.parse(meeting.people);

          if (Array.isArray(parsedPeople)) {
            const { changed, updatedList } = replaceNamesInArray(parsedPeople);
            if (changed) {
              updatedPeople = JSON.stringify(updatedList);
              peopleChanged = true;
            }
          } else if (
            parsedPeople &&
            typeof parsedPeople === 'object' &&
            Array.isArray(parsedPeople.people)
          ) {
            const { changed, updatedList } = replaceNamesInArray(parsedPeople.people);
            if (changed) {
              parsedPeople.people = updatedList;
              updatedPeople = JSON.stringify(parsedPeople);
              peopleChanged = true;
            }
          }
        } catch {
          const rawPeople = meeting.people
            .split(',')
            .map((name) => name.trim())
            .filter((name) => name.length > 0);

          if (rawPeople.length > 0) {
            const { changed, updatedList } = replaceNamesInArray(rawPeople);
            if (changed) {
              updatedPeople = updatedList.join(', ');
              peopleChanged = true;
            }
          }
        }

        if (peopleChanged) {
          hasChanges = true;
        }
      }

      if (meeting.summary) {
        try {
          const summaryData = JSON.parse(meeting.summary);

          if (summaryData && typeof summaryData === 'object') {
            const participantKeys = [
              'People in meetings',
              'People in Meetings',
              'participants',
              'Participants'
            ];

            let summaryChanged = false;

            participantKeys.forEach((key) => {
              if (Array.isArray(summaryData[key])) {
                const { changed, updatedList } = replaceNamesInArray(summaryData[key]);
                if (changed) {
                  summaryData[key] = updatedList;
                  summaryChanged = true;
                }
              }
            });

            if (summaryChanged) {
              updatedSummary = JSON.stringify(summaryData);
              hasChanges = true;
            }
          }
        } catch {
          // Non-JSON summaries are ignored to avoid unintended replacements
        }
      }

      if (hasChanges) {
        await db.query(
          'UPDATE meetings SET people = ?, summary = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
          [updatedPeople, updatedSummary, meeting.id, userId]
        );
        updatedCount += 1;
      }
    }

    return { updatedMeetings: updatedCount };
  }
}

module.exports = new MeetingService();
