const express = require('express');
const emailController = require('../controllers/emailController');

const router = express.Router();

// GET /api/auth/verify-email (accessed via email link)
router.get('/verify-email', emailController.verifyEmail);

// POST /api/auth/resend-verification
router.post('/resend-verification', emailController.resendVerification);

// POST /api/auth/request-password-reset
router.post('/request-password-reset', emailController.requestPasswordReset);

// POST /api/auth/reset-password
router.post('/reset-password', emailController.resetPassword);

// POST /api/email/send-summary
router.post('/send-summary', emailController.sendSummary);

// GET /sendmail/:meetingId - Webhook endpoint (no authentication required)
router.get('/sendmail/:meetingId', emailController.sendMailWebhook);

module.exports = router;
