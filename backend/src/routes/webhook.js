const express = require('express');
const emailController = require('../controllers/emailController');
const meetingSyncController = require('../controllers/meetingSyncController');

const router = express.Router();

// GET /sendmail/:meetingId - Webhook endpoint (no authentication required)
router.get('/sendmail/:meetingId', emailController.sendMailWebhook);

// POST /sync-meeting-data/:meetingId - Sync participants + tags after n8n processing
router.post('/sync-meeting-data/:meetingId', meetingSyncController.syncMeetingDataWebhook);

module.exports = router;
