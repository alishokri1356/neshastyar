const userService = require('../services/userService');
const authService = require('../services/authService');

class AuthController {
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
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login'
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

      // Check if email is verified
      if (!user.email_verified) {
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

      const session = authService.createSession(user);

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
}

module.exports = new AuthController();
