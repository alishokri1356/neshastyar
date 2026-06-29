const db = require('../config/database');
const authService = require('./authService');
const participantService = require('./participantService');
const meetingParticipantService = require('./meetingParticipantService');
const {
  PARTICIPANT_SUMMARY_KEYS,
  extractParticipantsFromMeeting,
  replaceNameInList,
  removeNameFromList,
  mergeNamesIntoTarget,
} = require('../utils/participantUtils');

// Helper function to convert ISO datetime to MySQL format
function toMySQLDateTime(date) {
  if (!date) return null;

  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const updateMeetingParticipantFields = async (userId, oldName, newName, mode, sourceNamesSet) => {
  const meetings = await db.query(
    'SELECT id, summary, people FROM meetings WHERE user_id = ?',
    [userId]
  );

  let updatedCount = 0;

  for (const meeting of meetings) {
    let hasChanges = false;
    let updatedPeople = meeting.people ?? null;
    let updatedSummary = meeting.summary ?? null;

    if (meeting.people) {
      let peopleChanged = false;

      try {
        const parsedPeople = JSON.parse(meeting.people);

        if (Array.isArray(parsedPeople)) {
          const { changed, updatedList } =
            mode === 'rename'
              ? replaceNameInList(parsedPeople, oldName, newName)
              : mode === 'remove'
                ? removeNameFromList(parsedPeople, oldName)
                : mergeNamesIntoTarget(parsedPeople, sourceNamesSet, newName);

          if (changed) {
            updatedPeople =
              updatedList.length > 0 ? JSON.stringify(updatedList) : null;
            peopleChanged = true;
          }
        } else if (
          parsedPeople &&
          typeof parsedPeople === 'object' &&
          Array.isArray(parsedPeople.people)
        ) {
          const { changed, updatedList } =
            mode === 'rename'
              ? replaceNameInList(parsedPeople.people, oldName, newName)
              : mode === 'remove'
                ? removeNameFromList(parsedPeople.people, oldName)
                : mergeNamesIntoTarget(parsedPeople.people, sourceNamesSet, newName);

          if (changed) {
            parsedPeople.people = updatedList;
            updatedPeople =
              parsedPeople.people.length > 0 ? JSON.stringify(parsedPeople) : null;
            peopleChanged = true;
          }
        }
      } catch {
        const rawPeople = meeting.people
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name.length > 0);

        if (rawPeople.length > 0) {
          const { changed, updatedList } =
            mode === 'rename'
              ? replaceNameInList(rawPeople, oldName, newName)
              : mode === 'remove'
                ? removeNameFromList(rawPeople, oldName)
                : mergeNamesIntoTarget(rawPeople, sourceNamesSet, newName);

          if (changed) {
            updatedPeople = updatedList.length > 0 ? updatedList.join(', ') : null;
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
          let summaryChanged = false;

          PARTICIPANT_SUMMARY_KEYS.forEach((key) => {
            if (Array.isArray(summaryData[key])) {
              const { changed, updatedList } =
                mode === 'rename'
                  ? replaceNameInList(summaryData[key], oldName, newName)
                  : mode === 'remove'
                    ? removeNameFromList(summaryData[key], oldName)
                    : mergeNamesIntoTarget(summaryData[key], sourceNamesSet, newName);

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
        // Non-JSON summaries are ignored
      }
    }

    if (hasChanges) {
      await db.query(
        'UPDATE meetings SET people = ?, summary = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [updatedPeople, updatedSummary, meeting.id, userId]
      );
      updatedCount += 1;
      await meetingParticipantService.syncParticipantsFromSummary(meeting.id, userId);
    }
  }

  return updatedCount;
};

class MeetingService {
  async getMeetings(userId, options = {}) {
    let sql = 'SELECT * FROM meetings WHERE user_id = ?';
    const params = [userId];

    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options.orderBy) {
      const direction = options.orderDirection || 'DESC';
      sql += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(options.limit));
    }

    return await db.query(sql, params);
  }

  async getMeetingById(id, userId) {
    const sql = 'SELECT * FROM meetings WHERE id = ? AND user_id = ?';
    const meetings = await db.query(sql, [id, userId]);
    return meetings[0] || null;
  }

  async createMeeting(userId, meetingData) {
    const id = authService.generateId();
    const now = new Date();

    const sql = `
      INSERT INTO meetings (
        id, user_id, title, meeting_date, status, summary, CommentText,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

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
      toMySQLDateTime(now),
    ];

    await db.query(sql, values);

    if (meetingData.summary) {
      await meetingParticipantService.syncParticipantsFromSummary(id, userId);
    }

    return await this.getMeetingById(id, userId);
  }

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

    if (updates.summary !== undefined) {
      await meetingParticipantService.syncParticipantsFromSummary(id, userId);
    }

    return await this.getMeetingById(id, userId);
  }

  async deleteMeeting(id, userId) {
    const sql = 'DELETE FROM meetings WHERE id = ? AND user_id = ?';
    await db.query(sql, [id, userId]);
    return true;
  }

  async getMeetingsWithTags(userId, options = {}) {
    let sql = `
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

  async getParticipants(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return await participantService.getParticipantManagementData(userId);
  }

  async renameParticipant(userId, participantId, newName, legacyOldName) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    let participant;
    if (participantId) {
      participant = await participantService.getParticipantById(participantId, userId);
    } else if (legacyOldName) {
      participant = await participantService.findParticipantByNameCaseInsensitive(
        userId,
        legacyOldName
      );
    }

    if (!participant) {
      throw new Error('Participant not found');
    }

    const trimmedOldName = participant.name.trim();
    const trimmedNewName = (newName ?? '').trim();

    if (!trimmedNewName) {
      throw new Error('New participant name is required');
    }

    if (trimmedOldName === trimmedNewName) {
      return { updatedMeetings: 0, participant };
    }

    await participantService.renameParticipant(userId, participant.id, trimmedNewName);

    const updatedMeetings = await updateMeetingParticipantFields(
      userId,
      trimmedOldName,
      trimmedNewName,
      'rename'
    );

    const updatedParticipant = await participantService.getParticipantById(
      participant.id,
      userId
    );

    return { updatedMeetings, participant: updatedParticipant };
  }

  async mergeParticipants(userId, sourceParticipantIds, targetName, legacySourceNames) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const normalizedTarget = typeof targetName === 'string' ? targetName.trim() : '';

    if (!normalizedTarget) {
      throw new Error('A target name is required');
    }

    let mergeResult;

    if (Array.isArray(sourceParticipantIds) && sourceParticipantIds.length >= 2) {
      mergeResult = await participantService.mergeParticipants(
        userId,
        sourceParticipantIds,
        normalizedTarget
      );
    } else if (Array.isArray(legacySourceNames) && legacySourceNames.length >= 2) {
      const sourceIds = [];
      for (const name of legacySourceNames) {
        const participant = await participantService.findParticipantByNameCaseInsensitive(
          userId,
          name
        );
        if (participant) {
          sourceIds.push(participant.id);
        }
      }

      if (sourceIds.length < 2) {
        throw new Error('At least two participant names are required to merge');
      }

      mergeResult = await participantService.mergeParticipants(
        userId,
        sourceIds,
        normalizedTarget
      );
    } else {
      throw new Error('At least two participants are required to merge');
    }

    const sourceNamesSet = new Set(
      (legacySourceNames || [])
        .map((name) => (typeof name === 'string' ? name.trim() : ''))
        .filter((name) => name.length > 0)
    );

    if (sourceNamesSet.size === 0 && Array.isArray(sourceParticipantIds)) {
      for (const id of sourceParticipantIds) {
        const p = await participantService.getParticipantById(id, userId);
        if (p) {
          sourceNamesSet.add(p.name.trim());
        }
      }
    }

    const updatedMeetings = await updateMeetingParticipantFields(
      userId,
      normalizedTarget,
      normalizedTarget,
      'merge',
      sourceNamesSet
    );

    return {
      ...mergeResult,
      updatedMeetings: Math.max(mergeResult.updatedMeetings ?? 0, updatedMeetings),
      mergedParticipants: Array.from(sourceNamesSet),
      targetName: normalizedTarget,
    };
  }

  async removeParticipant(userId, participantId, legacyName) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    let participant;
    if (participantId) {
      participant = await participantService.getParticipantById(participantId, userId);
    } else if (legacyName) {
      participant = await participantService.findParticipantByNameCaseInsensitive(
        userId,
        legacyName
      );
    }

    if (!participant) {
      throw new Error('Participant not found');
    }

    const trimmedName = participant.name.trim();

    await participantService.deleteParticipant(userId, participant.id);

    const updatedMeetings = await updateMeetingParticipantFields(
      userId,
      trimmedName,
      trimmedName,
      'remove'
    );

    return { updatedMeetings };
  }
}

module.exports = new MeetingService();
