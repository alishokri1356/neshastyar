const express = require('express');
const meetingTagController = require('../controllers/meetingTagController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

// All routes require authentication and email verification
router.use(authenticateToken);
router.use(requireEmailVerification);

// GET /api/meeting-tags
router.get('/', meetingTagController.getMeetingTags);

// POST /api/meeting-tags
router.post('/', meetingTagController.createMeetingTag);

// DELETE /api/meeting-tags
router.delete('/', meetingTagController.deleteMeetingTag);

// DELETE /api/meeting-tags/:id
router.delete('/:id', meetingTagController.deleteMeetingTagById);

// GET /api/meeting-tags/meetings/:meetingId/tags
router.get('/meetings/:meetingId/tags', meetingTagController.getTagsForMeeting);

// GET /api/meeting-tags/tags/:tagId/meetings
router.get('/tags/:tagId/meetings', meetingTagController.getMeetingsForTag);

module.exports = router;
