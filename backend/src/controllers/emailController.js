const userService = require('../services/userService');
const emailService = require('../services/emailService');
const mysqlClient = require('../config/database');

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

  // POST /api/email/send-summary
  async sendSummary(req, res) {
    try {
      const { meetingId, meetingTitle, summary, userEmail, userName } = req.body;

      if (!meetingId || !meetingTitle || !summary || !userEmail) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Meeting ID, title, summary, and user email are required'
        });
      }

      if (!summary.trim()) {
        return res.status(400).json({
          error: 'Empty summary',
          message: 'Summary cannot be empty'
        });
      }

      await emailService.sendMeetingSummaryEmail(
        userEmail,
        userName || userEmail,
        meetingTitle,
        summary
      );

      res.json({
        data: { success: true },
        error: null
      });
    } catch (error) {
      console.error('Send summary email error:', error);
      res.status(500).json({
        error: 'Send failed',
        message: 'Failed to send meeting summary email'
      });
    }
  }

  // GET /sendmail/:meetingId - Webhook endpoint (no authentication required)
  async sendMailWebhook(req, res) {
    try {
      const { meetingId } = req.params;

      if (!meetingId) {
        return res.status(400).json({
          error: 'Missing meeting ID',
          message: 'Meeting ID is required'
        });
      }

      // Fetch meeting data from database
      const { data: meetingData, error: meetingError } = await mysqlClient
        .from('meetings')
        .select(`
          id,
          title,
          summary,
          user_id,
          users!inner(
            id,
            email,
            user_metadata
          )
        `)
        .eq('id', meetingId)
        .single();

      if (meetingError || !meetingData) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'Meeting with the specified ID was not found'
        });
      }

      if (!meetingData.summary || meetingData.summary.trim() === '') {
        return res.status(400).json({
          error: 'No summary available',
          message: 'This meeting does not have a summary to send'
        });
      }

      const userEmail = meetingData.users.email;
      const userName = meetingData.users.user_metadata?.name || userEmail;
      const meetingTitle = meetingData.title || `Meeting ${meetingId}`;

      // Send the email
      await emailService.sendMeetingSummaryEmail(
        userEmail,
        userName,
        meetingTitle,
        meetingData.summary
      );

      res.json({
        data: { 
          success: true,
          message: 'Meeting summary email sent successfully',
          meetingId: meetingId,
          userEmail: userEmail
        },
        error: null
      });
    } catch (error) {
      console.error('Send mail webhook error:', error);
      res.status(500).json({
        error: 'Send failed',
        message: 'Failed to send meeting summary email via webhook'
      });
    }
  }
}

module.exports = new EmailController();
