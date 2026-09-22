const userService = require('../services/userService');
const authService = require('../services/authService');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

// Support multiple client IDs (e.g., one for Web, one for Android if they differ)
// We include the hardcoded Web Client ID for the Android app so that even if the server
// has a different GOOGLE_CLIENT_ID for the React web app, it will accept both.
const envClientId = process.env.GOOGLE_CLIENT_ID;
const androidWebClientId = '361368197313-ob51trc4rb0lu13tpekcj4p3nmvl8os7.apps.googleusercontent.com';

const ALLOWED_CLIENT_IDS = [];
if (envClientId) {
  ALLOWED_CLIENT_IDS.push(...envClientId.split(',').map(id => id.trim()));
}
if (!ALLOWED_CLIENT_IDS.includes(androidWebClientId)) {
  ALLOWED_CLIENT_IDS.push(androidWebClientId);
}

const googleClient = new OAuth2Client();

class AuthController {
  // POST /api/auth/google
  async googleAuth(req, res) {
    try {
      const { id_token, idToken } = req.body;
      const tokenToVerify = id_token || idToken; // Support both naming conventions
      
      if (!tokenToVerify) {
        return res.status(400).json({
          error: 'Missing Google ID token',
          message: 'Google ID token is required'
        });
      }

      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: ALLOWED_CLIENT_IDS
      });
      const payload = ticket.getPayload();
      
      if (!payload || !payload.email) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Google token does not contain email'
        });
      }

      const email = payload.email;
      const name = payload.name || payload.given_name || 'کاربر گوگل';

      let user = await userService.findByEmail(email);

      if (!user) {
        // User does not exist, create a new one with verified email and a random password
        const randomPassword = crypto.randomBytes(32).toString('base64');
        user = await userService.createUser(email, randomPassword, name);
        // Automatically mark email as verified since it came from Google
        user = await userService.markEmailAsVerified(user.id);
      } else if (!user.email_verified) {
        // Existing user but email not verified, let's verify it since they logged in via Google
        user = await userService.markEmailAsVerified(user.id);
      }

      // Proceed to log the user in
      await userService.touchLastLogin(user.id);
      
      // Remove sensitive fields
      const { password_hash, email_verification_token, email_verification_expires, password_reset_token, password_reset_expires, ...userWithoutSensitiveData } = user;

      const session = authService.createSession(userWithoutSensitiveData);

      res.json({
        data: {
          user: session.user,
          session: session
        },
        error: null
      });

    } catch (error) {
      console.error('Google Auth error:', error);
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid Google token or backend error',
        details: error.message
      });
    }
  }

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Email and password are required'
        });
      }

      const user = await userService.verifyCredentials(email, password);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        });
      }

      // Check if email is verified
      if (!user.email_verified) {
        return res.status(403).json({
          error: 'Email not verified',
          message: 'Please verify your email address before logging in',
          requiresVerification: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        });
      }

      await userService.touchLastLogin(user.id);
      const session = authService.createSession(user);

      res.json({
        data: {
          user: session.user,
          session: session
        },
        error: null
      });
    } catch (error) {
      console.error('Login error:', error);
      const isDbError = Boolean(
        error &&
        (error.code === 'ECONNREFUSED' ||
          error.code === 'ER_ACCESS_DENIED_ERROR' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'PROTOCOL_CONNECTION_LOST')
      );

      if (isDbError) {
        return res.status(503).json({
          error: 'Database unavailable',
          message: 'Login is temporarily unavailable. Please try again in a few minutes.',
          code: error.code
        });
      }

      return res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login',
        code: error.code || null
      });
    }
  }

  // POST /api/auth/signup
  async signup(req, res) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Email and password are required'
        });
      }

      // Check if user already exists
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email already exists'
        });
      }

      const user = await userService.createUser(email, password, name);

      // Don't create session for unverified users
      res.status(201).json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            email_verified: false
          },
          session: null,
          message: 'Registration successful. Please check your email to verify your account.'
        },
        error: null
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        error: 'Signup failed',
        message: 'An error occurred during registration'
      });
    }
  }

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      // In a more sophisticated implementation, you might want to:
      // 1. Add the token to a blacklist
      // 2. Remove the session from the database
      // For now, we'll just return success
      
      res.json({
        error: null
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        message: 'An error occurred during logout'
      });
    }
  }

  // POST /api/auth/verify
  async verify(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          data: { session: null },
          error: null
        });
      }

      const decoded = authService.verifyToken(token);
      const user = await userService.findById(decoded.sub);

      if (!user) {
        return res.status(401).json({
          data: { session: null },
          error: null
        });
      }

      // Check if email is verified. Admin impersonation can open an unverified account.
      if (!user.email_verified && !decoded.impersonated) {
        return res.status(403).json({
          data: { session: null },
          error: {
            message: 'Email not verified',
            requiresVerification: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name
            }
          }
        });
      }

      const session = authService.createSession(
        user,
        decoded.impersonated ? { impersonated: true } : {},
      );

      res.json({
        data: { session: session },
        error: null
      });
    } catch (error) {
      console.error('Verify error:', error);
      res.status(401).json({
        data: { session: null },
        error: null
      });
    }
  }

  // GET /api/auth/profile - Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.sub;
      const user = await userService.findById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User not found'
        });
      }

      // Remove sensitive fields before sending response
      const { password_hash, email_verification_token, email_verification_expires, 
              password_reset_token, password_reset_expires, ...userResponse } = user;

      res.json({
        data: { user: userResponse },
        error: null
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get profile',
        message: 'An error occurred while retrieving the profile'
      });
    }
  }

  // PUT /api/auth/profile - Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.sub;
      const updates = req.body;

      // Only allow updating specific fields
      const allowedUpdates = {};
      if (updates.name !== undefined) allowedUpdates.name = updates.name;
      if (updates.baleID !== undefined) allowedUpdates.baleID = updates.baleID;

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({
          error: 'No valid fields to update',
          message: 'Please provide at least one valid field to update'
        });
      }

      const updatedUser = await userService.updateUser(userId, allowedUpdates);
      
      // Remove sensitive fields before sending response
      const { password_hash, email_verification_token, email_verification_expires, 
              password_reset_token, password_reset_expires, ...userResponse } = updatedUser;

      res.json({
        data: { user: userResponse },
        error: null
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: error.message || 'An error occurred while updating the profile'
      });
    }
  }
}

module.exports = new AuthController();
