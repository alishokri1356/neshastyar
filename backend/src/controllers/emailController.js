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
      try {
        const cooldownQuery = `SELECT lastTimeEmailSent FROM meetings WHERE id = ?`;
        const cooldownData = await mysqlClient.query(cooldownQuery, [meetingId]);
        
        if (cooldownData && cooldownData.length > 0) {
          const now = new Date();
          const lastEmailSent = cooldownData[0].lastTimeEmailSent ? new Date(cooldownData[0].lastTimeEmailSent) : null;
          
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
      } catch (e) {
        // Field might not exist yet, that's okay
        console.log('lastTimeEmailSent field not found, treating as null');
      }

      await emailService.sendMeetingSummaryEmail(
        userEmail,
        userName || userEmail,
        meetingTitle,
        summary
      );

      // Update lastTimeEmailSent timestamp
      const now = new Date();
      try {
        const updateQuery = `UPDATE meetings SET lastTimeEmailSent = ? WHERE id = ?`;
        await mysqlClient.query(updateQuery, [now.toISOString(), meetingId]);
      } catch (e) {
        // Field might not exist yet, log but don't fail
        console.log('Could not update lastTimeEmailSent field:', e.message);
      }

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
      console.log('🔗 Webhook called:', req.method, req.url);
      console.log('🔗 Meeting ID:', req.params.meetingId);
      
      const { meetingId } = req.params;

      if (!meetingId) {
        console.log('❌ Missing meeting ID');
        return res.status(400).json({
          error: 'Missing meeting ID',
          message: 'Meeting ID is required'
        });
      }

      // Fetch meeting data from database (handle case where lastTimeEmailSent might not exist)
      console.log('🔍 Fetching meeting data for ID:', meetingId);
      const meetingQuery = `
        SELECT id, title, summary, user_id 
        FROM meetings 
        WHERE id = ?
      `;
      const meetingData = await mysqlClient.query(meetingQuery, [meetingId]);

      if (!meetingData || meetingData.length === 0) {
        console.log('❌ Meeting not found');
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'Meeting with the specified ID was not found'
        });
      }

      const meeting = meetingData[0];
      console.log('✅ Meeting found:', meeting.title);

      // Try to get lastTimeEmailSent separately (in case field doesn't exist yet)
      let lastTimeEmailSent = null;
      try {
        const emailQuery = `SELECT lastTimeEmailSent FROM meetings WHERE id = ?`;
        const emailData = await mysqlClient.query(emailQuery, [meetingId]);
        lastTimeEmailSent = emailData[0]?.lastTimeEmailSent;
      } catch (e) {
        // Field might not exist yet, that's okay
        console.log('lastTimeEmailSent field not found, treating as null');
      }

      // Fetch user data separately
      console.log('🔍 Fetching user data for ID:', meeting.user_id);
      const userQuery = `
        SELECT id, email, user_metadata 
        FROM users 
        WHERE id = ?
      `;
      const userData = await mysqlClient.query(userQuery, [meeting.user_id]);

      if (!userData || userData.length === 0) {
        console.log('❌ User not found');
        return res.status(404).json({
          error: 'User not found',
          message: 'User associated with this meeting was not found'
        });
      }

      const user = userData[0];
      console.log('✅ User found:', user.email);

      if (!meeting.summary || meeting.summary.trim() === '') {
        return res.status(400).json({
          error: 'No summary available',
          message: 'This meeting does not have a summary to send'
        });
      }

      // Check cooldown period (1 minute = 60 seconds)
      const now = new Date();
      const lastEmailSent = lastTimeEmailSent ? new Date(lastTimeEmailSent) : null;
      
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

      const userEmail = user.email;
      const userName = user.user_metadata?.name || userEmail;
      const meetingTitle = meeting.title || `Meeting ${meetingId}`;

      // Send the email
      await emailService.sendMeetingSummaryEmail(
        userEmail,
        userName,
        meetingTitle,
        meeting.summary
      );

      // Update lastTimeEmailSent timestamp (handle case where field might not exist)
      try {
        const updateQuery = `UPDATE meetings SET lastTimeEmailSent = ? WHERE id = ?`;
        await mysqlClient.query(updateQuery, [now.toISOString(), meetingId]);
      } catch (e) {
        // Field might not exist yet, log but don't fail
        console.log('Could not update lastTimeEmailSent field:', e.message);
      }

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
