const db = require('../config/database');
const authService = require('./authService');

const PARTICIPANT_SUMMARY_KEYS = [
  'People in meetings',
  'People in Meetings',
  'participants',
  'Participants',
];

const safeJsonParse = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeAndFilterNames = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((name) => typeof name === 'string')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

const replaceNameInList = (list, oldName, newName) => {
  let changed = false;

  const updatedList = (Array.isArray(list) ? list : []).map((name) => {
    if (typeof name === 'string' && name.trim() === oldName) {
      changed = true;
      return newName;
    }
    return name;
  });

  return { changed, updatedList };
};

const removeNameFromList = (list, nameToRemove) => {
  let changed = false;

  const updatedList = (Array.isArray(list) ? list : []).filter((name) => {
    if (typeof name === 'string' && name.trim() === nameToRemove) {
      changed = true;
      return false;
    }
    return true;
  });

  return { changed, updatedList };
};

const mergeNamesIntoTarget = (list, sourceNamesSet, targetName) => {
  if (!Array.isArray(list)) {
    return { changed: false, updatedList: list };
  }

  const targetTrimmed = targetName.trim();
  let changed = false;
  const updatedList = [];
  const seen = new Set();

  for (const value of list) {
    if (typeof value !== 'string') {
      updatedList.push(value);
      continue;
    }

    const trimmedValue = value.trim();

    if (sourceNamesSet.has(trimmedValue)) {
      if (!seen.has(targetTrimmed)) {
        updatedList.push(targetTrimmed);
        seen.add(targetTrimmed);
      } else {
        changed = true;
      }

      if (trimmedValue !== targetTrimmed) {
        changed = true;
      }
      continue;
    }

    if (!seen.has(trimmedValue)) {
      updatedList.push(value);
      seen.add(trimmedValue);
    } else {
      changed = true;
    }
  }

  return { changed, updatedList };
};

const extractParticipantsFromMeeting = (meeting) => {
  const names = new Set();

  if (meeting.summary) {
    const summaryData = safeJsonParse(meeting.summary);
    if (summaryData && typeof summaryData === 'object') {
      PARTICIPANT_SUMMARY_KEYS.forEach((key) => {
        normalizeAndFilterNames(summaryData[key]).forEach((name) => names.add(name));
      });
    }
  }

  if (meeting.people) {
    const parsedPeople = safeJsonParse(meeting.people);

    if (Array.isArray(parsedPeople)) {
      normalizeAndFilterNames(parsedPeople).forEach((name) => names.add(name));
    } else if (
      parsedPeople &&
      typeof parsedPeople === 'object' &&
      Array.isArray(parsedPeople.people)
    ) {
      normalizeAndFilterNames(parsedPeople.people).forEach((name) => names.add(name));
    } else if (!parsedPeople) {
      meeting.people
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .forEach((name) => names.add(name));
    }
  }

  return Array.from(names);
};

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

    async getParticipants(userId) {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const meetings = await db.query(
        'SELECT id, summary, people FROM meetings WHERE user_id = ?',
        [userId]
      );

      const participantCounts = new Map();
      let noParticipantsCount = 0;

      for (const meeting of meetings) {
        const participantNames = extractParticipantsFromMeeting(meeting);

        if (participantNames.length === 0) {
          noParticipantsCount += 1;
          continue;
        }

        const uniqueNames = new Set(participantNames);
        uniqueNames.forEach((name) => {
          const currentCount = participantCounts.get(name) || 0;
          participantCounts.set(name, currentCount + 1);
        });
      }

      const participants = Array.from(participantCounts.entries()).map(([name, meetingCount]) => ({
        name,
        meetingCount,
      }));

      participants.sort((a, b) => {
        if (b.meetingCount !== a.meetingCount) {
          return b.meetingCount - a.meetingCount;
        }
        return a.name.localeCompare(b.name, 'fa');
      });

      return {
        participants,
        noParticipantsCount,
      };
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

    for (const meeting of meetings) {
      let hasChanges = false;
      let updatedPeople = meeting.people ?? null;
      let updatedSummary = meeting.summary ?? null;

      if (meeting.people) {
        let peopleChanged = false;

        try {
          const parsedPeople = JSON.parse(meeting.people);

          if (Array.isArray(parsedPeople)) {
              const { changed, updatedList } = replaceNameInList(
                parsedPeople,
                trimmedOldName,
                trimmedNewName
              );
            if (changed) {
              updatedPeople = JSON.stringify(updatedList);
              peopleChanged = true;
            }
          } else if (
            parsedPeople &&
            typeof parsedPeople === 'object' &&
            Array.isArray(parsedPeople.people)
          ) {
              const { changed, updatedList } = replaceNameInList(
                parsedPeople.people,
                trimmedOldName,
                trimmedNewName
              );
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
              const { changed, updatedList } = replaceNameInList(
                rawPeople,
                trimmedOldName,
                trimmedNewName
              );
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
            let summaryChanged = false;

              PARTICIPANT_SUMMARY_KEYS.forEach((key) => {
              if (Array.isArray(summaryData[key])) {
                  const { changed, updatedList } = replaceNameInList(
                    summaryData[key],
                    trimmedOldName,
                    trimmedNewName
                  );
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

  async mergeParticipants(userId, sourceNames, targetName) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const normalizedSources = Array.from(
      new Set(
        (Array.isArray(sourceNames) ? sourceNames : [])
          .map((name) => (typeof name === 'string' ? name.trim() : ''))
          .filter((name) => name.length > 0)
      )
    );

    const normalizedTarget = typeof targetName === 'string' ? targetName.trim() : '';

    if (normalizedSources.length < 2) {
      throw new Error('At least two participant names are required to merge');
    }

    if (!normalizedTarget) {
      throw new Error('A target name is required');
    }

    const sourceNamesSet = new Set(normalizedSources);

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
            const { changed, updatedList } = mergeNamesIntoTarget(
              parsedPeople,
              sourceNamesSet,
              normalizedTarget
            );
            if (changed) {
              updatedPeople = updatedList.length > 0 ? JSON.stringify(updatedList) : null;
              peopleChanged = true;
            }
          } else if (
            parsedPeople &&
            typeof parsedPeople === 'object' &&
            Array.isArray(parsedPeople.people)
          ) {
            const { changed, updatedList } = mergeNamesIntoTarget(
              parsedPeople.people,
              sourceNamesSet,
              normalizedTarget
            );
            if (changed) {
              parsedPeople.people = updatedList.length > 0 ? updatedList : [];
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
            const { changed, updatedList } = mergeNamesIntoTarget(
              rawPeople,
              sourceNamesSet,
              normalizedTarget
            );
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
                const { changed, updatedList } = mergeNamesIntoTarget(
                  summaryData[key],
                  sourceNamesSet,
                  normalizedTarget
                );
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

    return {
      updatedMeetings: updatedCount,
      mergedParticipants: Array.from(sourceNamesSet),
      targetName: normalizedTarget,
    };
  }

  // Remove a participant across all meetings for a user
  async removeParticipant(userId, participantName) {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const trimmedName = (participantName ?? '').trim();

      if (!trimmedName) {
        throw new Error('Participant name is required');
      }

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
              const { changed, updatedList } = removeNameFromList(parsedPeople, trimmedName);
              if (changed) {
                updatedPeople = updatedList.length > 0 ? JSON.stringify(updatedList) : null;
                peopleChanged = true;
              }
            } else if (
              parsedPeople &&
              typeof parsedPeople === 'object' &&
              Array.isArray(parsedPeople.people)
            ) {
              const { changed, updatedList } = removeNameFromList(parsedPeople.people, trimmedName);
              if (changed) {
                parsedPeople.people = updatedList;
                updatedPeople = parsedPeople.people.length > 0 ? JSON.stringify(parsedPeople) : null;
                peopleChanged = true;
              }
            }
          } catch {
            const rawPeople = meeting.people
              .split(',')
              .map((name) => name.trim())
              .filter((name) => name.length > 0);

            if (rawPeople.length > 0) {
              const { changed, updatedList } = removeNameFromList(rawPeople, trimmedName);
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
                  const { changed, updatedList } = removeNameFromList(
                    summaryData[key],
                    trimmedName
                  );
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
