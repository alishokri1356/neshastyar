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

  // Get tag by ID
  async getTagById(id, userId) {
    const sql = 'SELECT * FROM tags WHERE id = ? AND user_id = ?';
    const tags = await db.query(sql, [id, userId]);
    return tags[0] || null;
  }

  // Create new tag
  async createTag(userId, tagData) {
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
}

module.exports = new TagService();
