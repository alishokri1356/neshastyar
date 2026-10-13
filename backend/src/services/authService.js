const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  // Generate JWT token
  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate UUID
  generateId() {
    return uuidv4();
  }

  // Create session token. extraClaims are signed into the JWT (for example admin impersonation).
  createSession(user, extraClaims = {}) {
    const token = this.generateToken({ 
      sub: user.id, 
      email: user.email,
      aud: 'authenticated',
      role: 'authenticated',
      ...extraClaims,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt.toISOString(),
      refresh_token: token, // Simple implementation
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    };
  }

  // Short-lived token so GIS redirect can hand the session back to the SPA safely
  createGoogleHandoffToken(session) {
    return jwt.sign(
      {
        purpose: 'google_gis_handoff',
        access_token: session.access_token,
        expires_at: session.expires_at,
        user: session.user,
      },
      this.jwtSecret,
      { expiresIn: '2m' }
    );
  }

  verifyGoogleHandoffToken(token) {
    const decoded = this.verifyToken(token);
    if (decoded.purpose !== 'google_gis_handoff' || !decoded.access_token || !decoded.user) {
      throw new Error('Invalid Google handoff token');
    }
    return {
      access_token: decoded.access_token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: decoded.expires_at,
      refresh_token: decoded.access_token,
      user: decoded.user,
    };
  }
}

module.exports = new AuthService();
