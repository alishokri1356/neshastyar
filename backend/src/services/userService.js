const db = require('../config/database');
const authService = require('./authService');
const emailService = require('./emailService');
const crypto = require('crypto');

class UserService {
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

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, name || 'کاربر', emailVerificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't throw error - user is created successfully even if email fails
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
    const allowedFields = ['name', 'email'];
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

    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(sql, values);

    return await this.findById(id);
  }

  // Delete user
  async deleteUser(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    await db.query(sql, [id]);
    return true;
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
    await emailService.sendVerificationEmail(email, user.name || 'کاربر', emailVerificationToken);
    
    return { success: true };
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
      await emailService.sendPasswordResetEmail(email, user.name || 'کاربر', passwordResetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
    
    return { success: true };
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
