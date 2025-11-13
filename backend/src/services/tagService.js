const db = require('../config/database');
const authService = require('./authService');

class TagService {
  // Get tags for a user
  async getTags(userId, options = {}) {
    let sql = 'SELECT * FROM tags WHERE user_id = ?';
    const params = [userId];

    if (options.orderBy) {
      const direction = options.orderDirection || 'DESC';
      sql += ` ORDER BY ${options.orderBy} ${direction}`;
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    return await db.query(sql, params);
  }

  // Get tags with meeting count
  async getTagsWithCount(userId) {
    const sql = `
      SELECT 
        t.*,
        COUNT(mt.meeting_id) as meeting_count
      FROM tags t
      LEFT JOIN meeting_tags mt ON t.id = mt.tag_id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    return await db.query(sql, [userId]);
  }

  // Get tag management overview data
  async getTagManagementData(userId) {
    const [tagsWithCount, totalMeetingsRows, taggedMeetingsRows] = await Promise.all([
      this.getTagsWithCount(userId),
      db.query('SELECT COUNT(*) AS total FROM meetings WHERE user_id = ?', [userId]),
      db.query(
        `
          SELECT COUNT(DISTINCT mt.meeting_id) AS tagged
          FROM meeting_tags mt
          INNER JOIN meetings m ON mt.meeting_id = m.id
          WHERE m.user_id = ?
        `,
        [userId]
      ),
    ]);

    const totalMeetings = Number(totalMeetingsRows?.[0]?.total ?? 0);
    const taggedMeetings = Number(taggedMeetingsRows?.[0]?.tagged ?? 0);
    const untaggedMeetingsCount = Math.max(totalMeetings - taggedMeetings, 0);

    const normalizedTags = (tagsWithCount || []).map((tag) => ({
      ...tag,
      meeting_count: Number(tag.meeting_count ?? 0),
    }));

    return {
      tags: normalizedTags,
      untaggedMeetingsCount,
    };
  }

  // Get tag by ID
  async getTagById(id, userId) {
    const sql = 'SELECT * FROM tags WHERE id = ? AND user_id = ?';
    const tags = await db.query(sql, [id, userId]);
    return tags[0] || null;
  }

  // Get tag by name for a user
  async getTagByName(userId, name) {
    const sql = 'SELECT * FROM tags WHERE user_id = ? AND name = ?';
    const tags = await db.query(sql, [userId, name]);
    return tags[0] || null;
  }

  // Create new tag
  async createTag(userId, tagData) {
    // Check if tag name already exists for this user
    const existingTag = await this.getTagByName(userId, tagData.name);
    if (existingTag) {
      const error = new Error(`Tag with name "${tagData.name}" already exists`);
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }

    const id = authService.generateId();
    const now = new Date();

    const sql = `
      INSERT INTO tags (id, user_id, name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      userId,
      tagData.name,
      tagData.color || null,
      now,
      now
    ];

    await db.query(sql, values);
    return await this.getTagById(id, userId);
  }

  // Update tag
  async updateTag(id, userId, updates) {
    // Check if name is being updated and if it already exists
    if (updates.name) {
      const existingTag = await this.getTagByName(userId, updates.name);
      if (existingTag && existingTag.id !== id) {
        const error = new Error(`Tag with name "${updates.name}" already exists`);
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
    }

    const allowedFields = ['name', 'color'];
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

    const sql = `UPDATE tags SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
    await db.query(sql, values);

    return await this.getTagById(id, userId);
  }

  // Delete tag
  async deleteTag(id, userId) {
    const sql = 'DELETE FROM tags WHERE id = ? AND user_id = ?';
    await db.query(sql, [id, userId]);
    return true;
  }

  // Get meetings for a specific tag
  async getMeetingsByTag(tagId, userId) {
    const sql = `
      SELECT m.*
      FROM meetings m
      INNER JOIN meeting_tags mt ON m.id = mt.meeting_id
      WHERE mt.tag_id = ? AND m.user_id = ?
      ORDER BY m.created_at DESC
    `;

    return await db.query(sql, [tagId, userId]);
  }

  // Merge multiple tags into a target tag name
  async mergeTags(userId, sourceTagNames, targetTagName) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const normalizedSources = Array.from(
      new Set(
        (Array.isArray(sourceTagNames) ? sourceTagNames : [])
          .map((name) => (typeof name === 'string' ? name.trim() : ''))
          .filter((name) => name.length > 0)
      )
    );

    const normalizedTarget = typeof targetTagName === 'string' ? targetTagName.trim() : '';

    if (normalizedSources.length < 2) {
      throw new Error('At least two tag names are required to merge');
    }

    if (!normalizedTarget) {
      throw new Error('A target tag name is required');
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const namePlaceholders = normalizedSources.map(() => '?').join(', ');
      const [sourceTags] = await connection.query(
        `SELECT * FROM tags WHERE user_id = ? AND name IN (${namePlaceholders})`,
        [userId, ...normalizedSources]
      );

      if (!sourceTags || sourceTags.length === 0) {
        throw new Error('No tags found for provided names');
      }

      const foundNames = new Set(sourceTags.map((tag) => tag.name.trim().toLowerCase()));
      const missingNames = normalizedSources.filter(
        (name) => !foundNames.has(name.toLowerCase())
      );

      if (missingNames.length > 0) {
        throw new Error(`Tags not found: ${missingNames.join(', ')}`);
      }

      let targetTag =
        sourceTags.find(
          (tag) => tag.name.trim().toLowerCase() === normalizedTarget.toLowerCase()
        ) || null;

      if (!targetTag) {
        const [existingTargets] = await connection.query(
          'SELECT * FROM tags WHERE user_id = ? AND name = ? LIMIT 1',
          [userId, normalizedTarget]
        );

        if (existingTargets && existingTargets.length > 0) {
          targetTag = existingTargets[0];
        }
      }

      let createdTarget = false;
      const now = new Date();

      if (!targetTag) {
        const newId = authService.generateId();
        const baseColor = sourceTags[0]?.color || null;

        await connection.query(
          'INSERT INTO tags (id, user_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [newId, userId, normalizedTarget, baseColor, now, now]
        );

        targetTag = {
          id: newId,
          user_id: userId,
          name: normalizedTarget,
          color: baseColor,
          created_at: now,
          updated_at: now,
        };
        createdTarget = true;
      } else if (targetTag.name !== normalizedTarget) {
        await connection.query(
          'UPDATE tags SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?',
          [normalizedTarget, now, targetTag.id, userId]
        );
        targetTag.name = normalizedTarget;
      }

      const tagsToReassign = sourceTags.filter((tag) => tag.id !== targetTag.id);
      const tagsToReassignIds = tagsToReassign.map((tag) => tag.id);

      let updatedMeetings = 0;

      if (tagsToReassignIds.length > 0) {
        const idPlaceholders = tagsToReassignIds.map(() => '?').join(', ');

        const [affectedMeetings] = await connection.query(
          `SELECT DISTINCT meeting_id FROM meeting_tags WHERE tag_id IN (${idPlaceholders})`,
          tagsToReassignIds
        );

        updatedMeetings = Array.isArray(affectedMeetings) ? affectedMeetings.length : 0;

        await connection.query(
          `UPDATE meeting_tags SET tag_id = ? WHERE tag_id IN (${idPlaceholders})`,
          [targetTag.id, ...tagsToReassignIds]
        );

        await connection.query(
          `DELETE FROM tags WHERE id IN (${idPlaceholders}) AND user_id = ?`,
          [...tagsToReassignIds, userId]
        );
      }

      await connection.commit();

      return {
        targetTag: {
          id: targetTag.id,
          name: targetTag.name,
          color: targetTag.color,
        },
        mergedTagIds: tagsToReassignIds,
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

module.exports = new TagService();
