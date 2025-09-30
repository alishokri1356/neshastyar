const userService = require('../services/userService');

class EmailController {
  // GET /api/auth/verify-email
  async verifyEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          error: 'Missing token',
          message: 'Verification token is required'
        });
      }

      const user = await userService.verifyEmail(token);

      res.json({
        data: { user },
        error: null
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(400).json({
        error: 'Verification failed',
        message: error.message
      });
    }
  }

  // POST /api/auth/resend-verification
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Missing email',
          message: 'Email address is required'
        });
      }

      await userService.resendVerificationEmail(email);

      res.json({
        data: { success: true },
        error: null
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(400).json({
        error: 'Resend failed',
        message: error.message
      });
    }
  }

  // POST /api/auth/request-password-reset
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Missing email',
          message: 'Email address is required'
        });
      }

      await userService.requestPasswordReset(email);

      res.json({
        data: { success: true },
        error: null
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        error: 'Request failed',
        message: 'Failed to process password reset request'
      });
    }
  }

  // POST /api/auth/reset-password
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Token and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Invalid password',
          message: 'Password must be at least 6 characters long'
        });
      }

      await userService.resetPassword(token, newPassword);

      res.json({
        data: { success: true },
        error: null
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({
        error: 'Reset failed',
        message: error.message
      });
    }
  }
}

module.exports = new EmailController();
