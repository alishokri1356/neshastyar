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

      // Check cooldown period for authenticated endpoint as well
      const { data: meetingData, error: meetingError } = await mysqlClient
        .from('meetings')
        .select('lastTimeEmailSent')
        .eq('id', meetingId)
        .single();

      if (!meetingError && meetingData) {
        const now = new Date();
        const lastEmailSent = meetingData.lastTimeEmailSent ? new Date(meetingData.lastTimeEmailSent) : null;
        
        if (lastEmailSent) {
          const timeDiffSeconds = (now - lastEmailSent) / 1000;
          const cooldownSeconds = 60; // 1 minute
          
          if (timeDiffSeconds < cooldownSeconds) {
            const remainingSeconds = Math.ceil(cooldownSeconds - timeDiffSeconds);
            return res.status(429).json({
              error: 'Email cooldown active',
              message: `Please wait ${remainingSeconds} seconds before sending another email`,
              cooldownRemaining: remainingSeconds,
              lastEmailSent: lastEmailSent.toISOString()
            });
          }
        }
      }

      await emailService.sendMeetingSummaryEmail(
        userEmail,
        userName || userEmail,
        meetingTitle,
        summary
      );

      // Update lastTimeEmailSent timestamp
      const now = new Date();
      await mysqlClient
        .from('meetings')
        .update({ lastTimeEmailSent: now.toISOString() })
        .eq('id', meetingId);

      res.json({
        data: { 
          success: true,
          emailSentAt: now.toISOString()
        },
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

      // Fetch meeting data from database including lastTimeEmailSent
      const { data: meetingData, error: meetingError } = await mysqlClient
        .from('meetings')
        .select(`
          id,
          title,
          summary,
          user_id,
          lastTimeEmailSent,
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

      // Check cooldown period (1 minute = 60 seconds)
      const now = new Date();
      const lastEmailSent = meetingData.lastTimeEmailSent ? new Date(meetingData.lastTimeEmailSent) : null;
      
      if (lastEmailSent) {
        const timeDiffSeconds = (now - lastEmailSent) / 1000;
        const cooldownSeconds = 60; // 1 minute
        
        if (timeDiffSeconds < cooldownSeconds) {
          const remainingSeconds = Math.ceil(cooldownSeconds - timeDiffSeconds);
          return res.status(429).json({
            error: 'Email cooldown active',
            message: `Please wait ${remainingSeconds} seconds before sending another email`,
            cooldownRemaining: remainingSeconds,
            lastEmailSent: lastEmailSent.toISOString()
          });
        }
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

      // Update lastTimeEmailSent timestamp
      await mysqlClient
        .from('meetings')
        .update({ lastTimeEmailSent: now.toISOString() })
        .eq('id', meetingId);

      res.json({
        data: { 
          success: true,
          message: 'Meeting summary email sent successfully',
          meetingId: meetingId,
          userEmail: userEmail,
          emailSentAt: now.toISOString()
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
