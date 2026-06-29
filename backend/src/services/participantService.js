const db = require('../config/database');
const authService = require('./authService');

class ParticipantService {
  async getParticipantsWithCount(userId) {
    const sql = `
      SELECT
        p.id,
        p.name,
        p.created_at,
        p.updated_at,
        COUNT(mp.meeting_id) AS meeting_count
      FROM participants p
      LEFT JOIN meeting_participants mp ON p.id = mp.participant_id
      LEFT JOIN meetings m ON mp.meeting_id = m.id AND m.user_id = ?
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY meeting_count DESC, p.name ASC
    `;

    const rows = await db.query(sql, [userId, userId]);

    return (rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      meetingCount: Number(row.meeting_count ?? 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async getNoParticipantsCount(userId) {
    const rows = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM meetings m
        LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
        WHERE m.user_id = ? AND mp.meeting_id IS NULL
      `,
      [userId]
    );

    return Number(rows?.[0]?.total ?? 0);
  }

  async getParticipantManagementData(userId) {
    const [participants, noParticipantsCount] = await Promise.all([
      this.getParticipantsWithCount(userId),
      this.getNoParticipantsCount(userId),
    ]);

    return { participants, noParticipantsCount };
  }

  async getParticipantById(id, userId) {
    const rows = await db.query(
      'SELECT * FROM participants WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows[0] || null;
  }

  async getParticipantByName(userId, name) {
    const rows = await db.query(
      'SELECT * FROM participants WHERE user_id = ? AND name = ?',
      [userId, name]
    );
    return rows[0] || null;
  }

  async findParticipantByNameCaseInsensitive(userId, name) {
    const rows = await db.query(
      'SELECT * FROM participants WHERE user_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?))',
      [userId, name]
    );
    return rows[0] || null;
  }

  async createParticipant(userId, name) {
    const trimmedName = (name ?? '').trim();
    if (!trimmedName) {
      throw new Error('Participant name is required');
    }

    const existing = await this.getParticipantByName(userId, trimmedName);
    if (existing) {
      return existing;
    }

    const id = authService.generateId();
    const now = new Date();

    await db.query(
      'INSERT INTO participants (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, userId, trimmedName, now, now]
    );

    return await this.getParticipantById(id, userId);
  }

  async upsertParticipantByName(userId, name) {
    const trimmedName = (name ?? '').trim();
    if (!trimmedName) {
      return null;
    }

    const existing = await this.findParticipantByNameCaseInsensitive(userId, trimmedName);
    if (existing) {
      return existing;
    }

    return await this.createParticipant(userId, trimmedName);
  }

  async renameParticipant(userId, participantId, newName) {
    const trimmedNewName = (newName ?? '').trim();
    if (!trimmedNewName) {
      throw new Error('New participant name is required');
    }

    const participant = await this.getParticipantById(participantId, userId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    if (participant.name === trimmedNewName) {
      return participant;
    }

    const duplicate = await this.getParticipantByName(userId, trimmedNewName);
    if (duplicate && duplicate.id !== participantId) {
      const error = new Error(`Participant with name "${trimmedNewName}" already exists`);
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }

    await db.query(
      'UPDATE participants SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [trimmedNewName, new Date(), participantId, userId]
    );

    return await this.getParticipantById(participantId, userId);
  }

  async deleteParticipant(userId, participantId) {
    const participant = await this.getParticipantById(participantId, userId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    await db.query('DELETE FROM participants WHERE id = ? AND user_id = ?', [
      participantId,
      userId,
    ]);

    return { deletedParticipant: participant };
  }

  async getMeetingsWithoutParticipants(userId) {
    const sql = `
      SELECT m.*
      FROM meetings m
      LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
      WHERE m.user_id = ? AND mp.meeting_id IS NULL
      ORDER BY m.created_at DESC
    `;

    return await db.query(sql, [userId]);
  }

  async getMeetingsByParticipant(participantId, userId) {
    const participant = await this.getParticipantById(participantId, userId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    const sql = `
      SELECT m.*
      FROM meetings m
      INNER JOIN meeting_participants mp ON m.id = mp.meeting_id
      WHERE mp.participant_id = ? AND m.user_id = ?
      ORDER BY m.created_at DESC
    `;

    return await db.query(sql, [participantId, userId]);
  }

  async mergeParticipants(userId, sourceParticipantIds, targetName) {
    const normalizedTarget = typeof targetName === 'string' ? targetName.trim() : '';
    const sourceIds = Array.from(
      new Set(
        (Array.isArray(sourceParticipantIds) ? sourceParticipantIds : []).filter(
          (id) => typeof id === 'string' && id.length > 0
        )
      )
    );

    if (sourceIds.length < 2) {
      throw new Error('At least two participants are required to merge');
    }

    if (!normalizedTarget) {
      throw new Error('A target name is required');
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const placeholders = sourceIds.map(() => '?').join(', ');
      const [sourceParticipants] = await connection.query(
        `SELECT * FROM participants WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...sourceIds]
      );

      if (!sourceParticipants || sourceParticipants.length < 2) {
        throw new Error('At least two valid participants are required to merge');
      }

      if (sourceParticipants.length !== sourceIds.length) {
        throw new Error('One or more participants were not found');
      }

      let targetParticipant =
        sourceParticipants.find(
          (p) => p.name.trim().toLowerCase() === normalizedTarget.toLowerCase()
        ) || null;

      if (!targetParticipant) {
        const [existingTargets] = await connection.query(
          'SELECT * FROM participants WHERE user_id = ? AND name = ? LIMIT 1',
          [userId, normalizedTarget]
        );

        if (existingTargets && existingTargets.length > 0) {
          targetParticipant = existingTargets[0];
        }
      }

      const now = new Date();
      let createdTarget = false;

      if (!targetParticipant) {
        const newId = authService.generateId();
        await connection.query(
          'INSERT INTO participants (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [newId, userId, normalizedTarget, now, now]
        );
        targetParticipant = { id: newId, name: normalizedTarget };
        createdTarget = true;
      } else if (targetParticipant.name !== normalizedTarget) {
        await connection.query(
          'UPDATE participants SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?',
          [normalizedTarget, now, targetParticipant.id, userId]
        );
        targetParticipant.name = normalizedTarget;
      }

      const participantsToMerge = sourceParticipants.filter((p) => p.id !== targetParticipant.id);
      const mergeIds = participantsToMerge.map((p) => p.id);

      let updatedMeetings = 0;

      if (mergeIds.length > 0) {
        const mergePlaceholders = mergeIds.map(() => '?').join(', ');

        const [affectedMeetings] = await connection.query(
          `SELECT DISTINCT meeting_id FROM meeting_participants WHERE participant_id IN (${mergePlaceholders})`,
          mergeIds
        );

        updatedMeetings = Array.isArray(affectedMeetings) ? affectedMeetings.length : 0;

        const [meetingsToUpdate] = await connection.query(
          `SELECT DISTINCT meeting_id FROM meeting_participants WHERE participant_id IN (${mergePlaceholders})`,
          mergeIds
        );

        for (const row of meetingsToUpdate || []) {
          const meetingId = row.meeting_id;

          const [targetLink] = await connection.query(
            'SELECT id FROM meeting_participants WHERE meeting_id = ? AND participant_id = ? LIMIT 1',
            [meetingId, targetParticipant.id]
          );

          if (targetLink.length > 0) {
            await connection.query(
              `DELETE FROM meeting_participants WHERE meeting_id = ? AND participant_id IN (${mergePlaceholders})`,
              [meetingId, ...mergeIds]
            );
          } else {
            const [sourceLink] = await connection.query(
              `SELECT id FROM meeting_participants WHERE meeting_id = ? AND participant_id IN (${mergePlaceholders}) LIMIT 1`,
              [meetingId, ...mergeIds]
            );

            if (sourceLink.length > 0) {
              await connection.query(
                'UPDATE meeting_participants SET participant_id = ? WHERE id = ?',
                [targetParticipant.id, sourceLink[0].id]
              );

              await connection.query(
                `DELETE FROM meeting_participants WHERE meeting_id = ? AND participant_id IN (${mergePlaceholders}) AND id <> ?`,
                [meetingId, ...mergeIds, sourceLink[0].id]
              );
            }
          }
        }

        await connection.query(
          `DELETE FROM participants WHERE id IN (${mergePlaceholders}) AND user_id = ?`,
          [...mergeIds, userId]
        );
      }

      await connection.commit();

      return {
        targetParticipant: {
          id: targetParticipant.id,
          name: normalizedTarget,
        },
        mergedParticipantIds: mergeIds,
        createdTarget,
        updatedMeetings,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new ParticipantService();
