const express = require('express');
const emailController = require('../controllers/emailController');

const router = express.Router();

// GET /sendmail/:meetingId - Webhook endpoint (no authentication required)
router.get('/sendmail/:meetingId', emailController.sendMailWebhook);

module.exports = router;
