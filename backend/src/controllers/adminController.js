const authService = require('../services/authService');
const userService = require('../services/userService');
const db = require('../config/database');

class AdminController {
  getCredentials() {
    return {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'Macer256!',
    };
  }

  // POST /api/admin/login
  async login(req, res) {
    try {
      const { username, password } = req.body || {};
      const creds = this.getCredentials();

      if (!username || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Username and password are required',
        });
      }

      if (username !== creds.username || password !== creds.password) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Invalid admin username or password',
        });
      }

      const token = authService.generateToken({
        sub: 'admin',
        username: creds.username,
        role: 'admin',
        aud: 'admin',
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      return res.json({
        data: {
          access_token: token,
          token_type: 'bearer',
          expires_at: expiresAt.toISOString(),
          admin: { username: creds.username, role: 'admin' },
        },
        error: null,
      });
    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during admin login',
      });
    }
  }

  // GET /api/admin/me
  async me(req, res) {
    return res.json({
      data: {
        admin: {
          username: req.admin.username || 'admin',
          role: 'admin',
        },
      },
      error: null,
    });
  }

  userSelectSql(whereClause = '') {
    return `
      SELECT
        u.id,
        u.email,
        u.name,
        u.baleID,
        u.email_verified,
        u.email_verification_expires,
        u.password_reset_expires,
        u.last_email_type,
        u.last_email_status,
        u.last_email_at,
        u.last_email_id,
        u.last_email_error,
        u.last_login_at,
        CASE
          WHEN u.email_verification_token IS NOT NULL
           AND u.email_verification_expires IS NOT NULL
           AND u.email_verification_expires > NOW()
          THEN 1 ELSE 0
        END AS verification_email_pending,
        CASE
          WHEN u.password_reset_token IS NOT NULL
           AND u.password_reset_expires IS NOT NULL
           AND u.password_reset_expires > NOW()
          THEN 1 ELSE 0
        END AS password_reset_pending,
        u.created_at,
        u.updated_at,
        COUNT(m.id) AS meeting_count,
        MAX(m.updated_at) AS last_meeting_at
      FROM users u
      LEFT JOIN meetings m ON m.user_id = u.id
      ${whereClause}
      GROUP BY u.id
    `;
  }

  mapUserRow(row) {
    const resetPending = Boolean(row.password_reset_pending);
    const verificationPending = Boolean(row.verification_email_pending);
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      baleID: row.baleID,
      email_verified: Boolean(row.email_verified),
      verification_status: row.email_verified ? 'verified' : 'unverified',
      verification_email_pending: verificationPending,
      email_verification_expires: row.email_verification_expires || null,
      password_status: resetPending ? 'reset_pending' : 'set',
      password_reset_pending: resetPending,
      password_reset_expires: row.password_reset_expires || null,
      account_status: row.email_verified ? 'active' : 'pending_verification',
      email_delivery: {
        type: row.last_email_type || null,
        status: row.last_email_status || null,
        sent_at: row.last_email_at || null,
        message_id: row.last_email_id || null,
        error: row.last_email_error || null,
      },
      usage: {
        meeting_count: Number(row.meeting_count) || 0,
        last_meeting_at: row.last_meeting_at || null,
      },
      last_login_at: row.last_login_at || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async fetchMappedUser(id) {
    const rows = await db.query(
      `${this.userSelectSql('WHERE u.id = ?')} ORDER BY u.created_at DESC`,
      [id]
    );
    return rows[0] ? this.mapUserRow(rows[0]) : null;
  }

  // GET /api/admin/users
  async listUsers(req, res) {
    try {
      const q = (req.query.q || '').trim();
      const params = [];
      let where = '';

      if (q) {
        where = 'WHERE u.email LIKE ? OR u.name LIKE ? OR u.id LIKE ?';
        const like = `%${q}%`;
        params.push(like, like, like);
      }

      const rows = await db.query(
        `${this.userSelectSql(where)} ORDER BY u.created_at DESC`,
        params
      );
      const users = rows.map((row) => this.mapUserRow(row));

      return res.json({
        data: {
          users,
          total: users.length,
        },
        error: null,
      });
    } catch (error) {
      console.error('Admin list users error:', error);
      return res.status(500).json({
        error: 'List failed',
        message: 'Failed to load users',
      });
    }
  }

  // GET /api/admin/users/:id
  async getUser(req, res) {
    try {
      const user = await this.fetchMappedUser(req.params.id);
      if (!user) {
        return res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
      }

      return res.json({
        data: { user },
        error: null,
      });
    } catch (error) {
      console.error('Admin get user error:', error);
      return res.status(500).json({
        error: 'Fetch failed',
        message: 'Failed to load user',
      });
    }
  }

  // PATCH /api/admin/users/:id
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, email_verified, baleID, password } = req.body || {};

      const existing = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      if (!existing.length) {
        return res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
      }

      const fields = [];
      const values = [];

      if (name !== undefined) {
        fields.push('name = ?');
        values.push(name === '' ? null : name);
      }

      if (email !== undefined) {
        const trimmed = String(email).trim().toLowerCase();
        if (!trimmed) {
          return res.status(400).json({
            error: 'Invalid email',
            message: 'Email cannot be empty',
          });
        }
        const clash = await db.query(
          'SELECT id FROM users WHERE email = ? AND id <> ?',
          [trimmed, id]
        );
        if (clash.length) {
          return res.status(409).json({
            error: 'Email in use',
            message: 'Another user already uses this email',
          });
        }
        fields.push('email = ?');
        values.push(trimmed);
      }

      if (email_verified !== undefined) {
        fields.push('email_verified = ?');
        values.push(email_verified ? 1 : 0);
        if (email_verified) {
          fields.push('email_verification_token = NULL');
          fields.push('email_verification_expires = NULL');
        }
      }

      if (baleID !== undefined) {
        fields.push('baleID = ?');
        values.push(baleID === '' ? null : String(baleID).slice(0, 20));
      }

      if (password !== undefined && password !== null && password !== '') {
        if (String(password).length < 6) {
          return res.status(400).json({
            error: 'Invalid password',
            message: 'Password must be at least 6 characters',
          });
        }
        const hash = await authService.hashPassword(String(password));
        fields.push('password_hash = ?');
        values.push(hash);
        fields.push('password_reset_token = NULL');
        fields.push('password_reset_expires = NULL');
      }

      if (!fields.length) {
        return res.status(400).json({
          error: 'No changes',
          message: 'No valid fields to update',
        });
      }

      fields.push('updated_at = NOW()');
      values.push(id);

      await db.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      const user = await this.fetchMappedUser(id);
      return res.json({
        data: { user },
        error: null,
      });
    } catch (error) {
      console.error('Admin update user error:', error);
      return res.status(500).json({
        error: 'Update failed',
        message: 'Failed to update user',
      });
    }
  }

  // DELETE /api/admin/users/:id
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = await this.fetchMappedUser(id);
      if (!user) {
        return res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
      }

      const result = await userService.deleteUser(id);
      return res.json({
        data: {
          deleted: true,
          id,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          counts: result.counts,
        },
        error: null,
      });
    } catch (error) {
      console.error('Admin delete user error:', error);
      const status = error.message === 'User not found' ? 404 : 500;
      return res.status(status).json({
        error: 'Delete failed',
        message: error.message || 'Failed to delete user',
      });
    }
  }

  // POST /api/admin/users/:id/resend-verification
  async resendVerification(req, res) {
    try {
      const { id } = req.params;
      const result = await userService.adminResendVerification(id);
      const user = await this.fetchMappedUser(id);
      return res.json({
        data: {
          user,
          email: {
            type: 'verification',
            status: 'sent',
            message_id: result.messageId || null,
          },
        },
        error: null,
      });
    } catch (error) {
      console.error('Admin resend verification error:', error);
      try {
        const user = await this.fetchMappedUser(req.params.id);
        if (user) {
          return res.status(400).json({
            error: 'Send failed',
            message: error.message || 'Failed to send verification email',
            data: { user },
          });
        }
      } catch {
        // ignore
      }
      const status = error.message === 'User not found' ? 404 : 400;
      return res.status(status).json({
        error: 'Send failed',
        message: error.message || 'Failed to send verification email',
      });
    }
  }

  // POST /api/admin/users/:id/resend-password-reset
  async resendPasswordReset(req, res) {
    try {
      const { id } = req.params;
      const result = await userService.adminSendPasswordReset(id);
      const user = await this.fetchMappedUser(id);
      return res.json({
        data: {
          user,
          email: {
            type: 'password_reset',
            status: 'sent',
            message_id: result.messageId || null,
          },
        },
        error: null,
      });
    } catch (error) {
      console.error('Admin resend password reset error:', error);
      try {
        const user = await this.fetchMappedUser(req.params.id);
        if (user) {
          return res.status(400).json({
            error: 'Send failed',
            message: error.message || 'Failed to send password reset email',
            data: { user },
          });
        }
      } catch {
        // ignore
      }
      const status = error.message === 'User not found' ? 404 : 400;
      return res.status(status).json({
        error: 'Send failed',
        message: error.message || 'Failed to send password reset email',
      });
    }
  }
}

module.exports = new AdminController();
