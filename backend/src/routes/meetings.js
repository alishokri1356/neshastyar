const express = require('express');
const meetingController = require('../controllers/meetingController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

// All routes require authentication and email verification
router.use(authenticateToken);
router.use(requireEmailVerification);

// GET /api/meetings
router.get('/', meetingController.getMeetings);

// GET /api/meetings/untagged
router.get('/untagged', meetingController.getUntaggedMeetings);

// GET /api/meetings/:id
router.get('/:id', meetingController.getMeetingById);

// POST /api/meetings
router.post('/', meetingController.createMeeting);

// PUT /api/meetings/:id
router.put('/:id', meetingController.updateMeeting);

// DELETE /api/meetings/:id
router.delete('/:id', meetingController.deleteMeeting);

module.exports = router;
