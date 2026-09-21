const fs = require('fs/promises');
const path = require('path');
const db = require('../config/database');
const authService = require('./authService');
const emailService = require('./emailService');
const crypto = require('crypto');

class UserService {
  async recordEmailStatus(userId, type, status, messageId = null, errorMessage = null) {
    await db.query(
      `
      UPDATE users
      SET last_email_type = ?,
          last_email_status = ?,
          last_email_at = NOW(),
          last_email_id = ?,
          last_email_error = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [type, status, messageId, errorMessage ? String(errorMessage).slice(0, 1000) : null, userId]
    );
  }

  // Create new user with email verification
  async createUser(email, password, name = null) {
    const id = authService.generateId();
    const passwordHash = await authService.hashPassword(password);
    const now = new Date();
    
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const sql = `
      INSERT INTO users (id, email, password_hash, name, email_verified, email_verification_token, email_verification_expires, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.query(sql, [id, email, passwordHash, name, false, emailVerificationToken, emailVerificationExpires, now, now]);
    
    const user = {
      id,
      email,
      name,
      email_verified: false,
      created_at: now,
      updated_at: now
    };

    // Send verification email — account stays created so user can use resend-verification
    try {
      const result = await emailService.sendVerificationEmail(email, name || 'کاربر', emailVerificationToken);
      await this.recordEmailStatus(id, 'verification', 'sent', result.messageId || null, null);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      await this.recordEmailStatus(id, 'verification', 'failed', null, error.message || 'send failed');
    }

    return user;
  }

  // Find user by email
  async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const users = await db.query(sql, [email]);
    return users[0] || null;
  }

  // Find user by ID
  async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const users = await db.query(sql, [id]);
    return users[0] || null;
  }

  // Update user
  async updateUser(id, updates) {
    const allowedFields = ['name', 'email', 'baleID'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`\`${key}\` = ?`);
        values.push(value === '' ? null : value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = ?');
    values.push(new Date());
    values.push(id);

    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);

    return await this.findById(id);
  }

  async schemaHasTable(connection, tableName) {
    const [rows] = await connection.query(
      `SELECT 1
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       LIMIT 1`,
      [tableName]
    );
    return rows.length > 0;
  }

  async schemaHasColumn(connection, tableName, columnName) {
    const [rows] = await connection.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
       LIMIT 1`,
      [tableName, columnName]
    );
    return rows.length > 0;
  }

  resolveStoredFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') return null;
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const resolved = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(process.cwd(), filePath);
    if (!resolved.startsWith(uploadsRoot + path.sep) && resolved !== uploadsRoot) {
      return null;
    }
    return resolved;
  }

  async cleanupUserFiles(userId, filePaths) {
    for (const filePath of filePaths) {
      const resolved = this.resolveStoredFilePath(filePath);
      if (!resolved) continue;
      try {
        await fs.unlink(resolved);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn('Failed to delete user audio file:', resolved, error.message);
        }
      }
    }

    if (!userId || /[/\\]|\.\./.test(userId)) return;
    const userUploadDir = path.resolve(process.cwd(), 'uploads', 'audio', userId);
    const audioRoot = path.resolve(process.cwd(), 'uploads', 'audio');
    if (!userUploadDir.startsWith(audioRoot + path.sep)) return;

    try {
      await fs.rm(userUploadDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to delete user upload directory:', userUploadDir, error.message);
    }
  }

  // Delete user and all owned data (meetings, tags, participants, files)
  async deleteUser(id) {
    if (!id) {
      throw new Error('User id is required');
    }

    const connection = await db.getConnection();
    const filePaths = new Set();
    const deleted = {
      meetings: 0,
      tags: 0,
      participants: 0,
      sessions: 0,
      audio_files: 0,
    };

    try {
      await connection.beginTransaction();

      const [users] = await connection.query('SELECT id FROM users WHERE id = ?', [id]);
      if (!users.length) {
        throw new Error('User not found');
      }

      const hasAudioPath = await this.schemaHasColumn(connection, 'meetings', 'audio_file_path');
      const [meetings] = await connection.query(
        hasAudioPath
          ? 'SELECT id, audio_file_path FROM meetings WHERE user_id = ?'
          : 'SELECT id FROM meetings WHERE user_id = ?',
        [id]
      );
      const meetingIds = meetings.map((meeting) => meeting.id);
      deleted.meetings = meetingIds.length;

      for (const meeting of meetings) {
        if (meeting.audio_file_path) filePaths.add(meeting.audio_file_path);
      }

      if (meetingIds.length && (await this.schemaHasTable(connection, 'audio_files'))) {
        const placeholders = meetingIds.map(() => '?').join(',');
        const [audioFiles] = await connection.query(
          `SELECT file_path FROM audio_files WHERE meeting_id IN (${placeholders})`,
          meetingIds
        );
        deleted.audio_files = audioFiles.length;
        for (const audioFile of audioFiles) {
          if (audioFile.file_path) filePaths.add(audioFile.file_path);
        }
        await connection.query(
          `DELETE FROM audio_files WHERE meeting_id IN (${placeholders})`,
          meetingIds
        );
      }

      if (meetingIds.length && (await this.schemaHasTable(connection, 'meeting_tags'))) {
        const placeholders = meetingIds.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM meeting_tags WHERE meeting_id IN (${placeholders})`,
          meetingIds
        );
      }

      if (meetingIds.length && (await this.schemaHasTable(connection, 'meeting_participants'))) {
        const placeholders = meetingIds.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM meeting_participants WHERE meeting_id IN (${placeholders})`,
          meetingIds
        );
      }

      if (await this.schemaHasTable(connection, 'meeting_tags')) {
        await connection.query(
          `DELETE mt FROM meeting_tags mt
           INNER JOIN tags t ON t.id = mt.tag_id
           WHERE t.user_id = ?`,
          [id]
        );
      }

      if (await this.schemaHasTable(connection, 'meeting_participants')) {
        await connection.query(
          `DELETE mp FROM meeting_participants mp
           INNER JOIN participants p ON p.id = mp.participant_id
           WHERE p.user_id = ?`,
          [id]
        );
      }

      await connection.query('DELETE FROM meetings WHERE user_id = ?', [id]);

      if (await this.schemaHasTable(connection, 'tags')) {
        const [tagResult] = await connection.query('DELETE FROM tags WHERE user_id = ?', [id]);
        deleted.tags = tagResult.affectedRows || 0;
      }

      if (await this.schemaHasTable(connection, 'participants')) {
        const [participantResult] = await connection.query(
          'DELETE FROM participants WHERE user_id = ?',
          [id]
        );
        deleted.participants = participantResult.affectedRows || 0;
      }

      if (await this.schemaHasTable(connection, 'sessions')) {
        const [sessionResult] = await connection.query(
          'DELETE FROM sessions WHERE user_id = ?',
          [id]
        );
        deleted.sessions = sessionResult.affectedRows || 0;
      }

      await connection.query('DELETE FROM users WHERE id = ?', [id]);
      await connection.commit();
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('User delete rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      connection.release();
    }

    await this.cleanupUserFiles(id, filePaths);
    return { deleted: true, id, counts: deleted };
  }

  // Verify user credentials
  async verifyCredentials(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await authService.comparePassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async touchLastLogin(userId) {
    await db.query(
      'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?',
      [userId]
    );
  }

  // Verify email with token
  async verifyEmail(token) {
    const sql = `
      SELECT * FROM users 
      WHERE email_verification_token = ? 
      AND email_verification_expires > NOW()
    `;
    
    const users = await db.query(sql, [token]);
    if (users.length === 0) {
      throw new Error('Invalid or expired verification token');
    }

    const user = users[0];
    
    // Update user as verified
    const updateSql = `
      UPDATE users 
      SET email_verified = true, 
          email_verification_token = NULL, 
          email_verification_expires = NULL,
          updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.query(updateSql, [user.id]);
    
    // Return user without sensitive data
    const { password_hash, email_verification_token, email_verification_expires, password_reset_token, password_reset_expires, ...verifiedUser } = user;
    return verifiedUser;
  }

  // Resend verification email
  async resendVerificationEmail(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.email_verified) {
      throw new Error('Email already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    const updateSql = `
      UPDATE users 
      SET email_verification_token = ?, 
          email_verification_expires = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.query(updateSql, [emailVerificationToken, emailVerificationExpires, user.id]);

    // Send verification email
    try {
      const result = await emailService.sendVerificationEmail(email, user.name || 'کاربر', emailVerificationToken);
      await this.recordEmailStatus(user.id, 'verification', 'sent', result.messageId || null, null);
      return { success: true, messageId: result.messageId || null };
    } catch (error) {
      console.error('Failed to send verification email:', error);
      await this.recordEmailStatus(user.id, 'verification', 'failed', null, error.message || 'send failed');
      throw new Error('Failed to send verification email');
    }
  }

  // Mark an email as verified directly (e.g. for OAuth logins)
  async markEmailAsVerified(userId) {
    const updateSql = `
      UPDATE users 
      SET email_verified = true, 
          email_verification_token = NULL, 
          email_verification_expires = NULL,
          updated_at = NOW()
      WHERE id = ?
    `;
    await db.query(updateSql, [userId]);
    return await this.findById(userId);
  }

  // Request password reset
  async requestPasswordReset(email) {
    const user = await this.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { success: true };
    }

    // Generate password reset token
    const passwordResetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    const updateSql = `
      UPDATE users 
      SET password_reset_token = ?, 
          password_reset_expires = ?,
          updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.query(updateSql, [passwordResetToken, passwordResetExpires, user.id]);

    // Send password reset email
    try {
      const result = await emailService.sendPasswordResetEmail(email, user.name || 'کاربر', passwordResetToken);
      await this.recordEmailStatus(user.id, 'password_reset', 'sent', result.messageId || null, null);
      return { success: true, messageId: result.messageId || null };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      await this.recordEmailStatus(user.id, 'password_reset', 'failed', null, error.message || 'send failed');
      throw new Error('Failed to send password reset email');
    }
  }

  // Admin: resend verification by user id
  async adminResendVerification(userId) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.email_verified) {
      throw new Error('Email already verified');
    }
    return this.resendVerificationEmail(user.email);
  }

  // Admin: send password reset by user id
  async adminSendPasswordReset(userId) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const passwordResetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      `
      UPDATE users
      SET password_reset_token = ?,
          password_reset_expires = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [passwordResetToken, passwordResetExpires, user.id]
    );

    try {
      const result = await emailService.sendPasswordResetEmail(
        user.email,
        user.name || 'کاربر',
        passwordResetToken
      );
      await this.recordEmailStatus(user.id, 'password_reset', 'sent', result.messageId || null, null);
      return { success: true, messageId: result.messageId || null };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      await this.recordEmailStatus(user.id, 'password_reset', 'failed', null, error.message || 'send failed');
      throw new Error('Failed to send password reset email');
    }
  }

  // Reset password with token
  async resetPassword(token, newPassword) {
    const sql = `
      SELECT * FROM users 
      WHERE password_reset_token = ? 
      AND password_reset_expires > NOW()
    `;
    
    const users = await db.query(sql, [token]);
    if (users.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const user = users[0];
    const passwordHash = await authService.hashPassword(newPassword);
    
    // Update user password and clear reset token
    const updateSql = `
      UPDATE users 
      SET password_hash = ?, 
          password_reset_token = NULL, 
          password_reset_expires = NULL,
          updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.query(updateSql, [passwordHash, user.id]);
    
    return { success: true };
  }
}

module.exports = new UserService();
