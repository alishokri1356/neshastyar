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

// GET /api/meetings/analyze-models
router.get('/analyze-models', meetingController.getAnalyzeModels);

// GET /api/meetings/untagged
router.get('/untagged', meetingController.getUntaggedMeetings);

// GET /api/meetings/:id
router.get('/:id', meetingController.getMeetingById);

// POST /api/meetings
router.post('/', meetingController.createMeeting);

// PUT /api/meetings/:id
router.put('/:id', meetingController.updateMeeting);

// POST /api/meetings/:id/analyze
router.post('/:id/analyze', meetingController.triggerAnalyze);

// POST /api/meetings/:id/ai-edit
router.post('/:id/ai-edit', meetingController.aiEditMeeting);

// POST /api/meetings/:id/share
router.post('/:id/share', meetingController.enableShare);

// PATCH /api/meetings/:id/share
router.patch('/:id/share', meetingController.setShareCanEdit);

// DELETE /api/meetings/:id/share
router.delete('/:id/share', meetingController.disableShare);

// PUT /api/meetings/:id/participants/rename-suggested
router.put('/:id/participants/rename-suggested', meetingController.renameSuggestedParticipantInMeeting);

// DELETE /api/meetings/:id
router.delete('/:id', meetingController.deleteMeeting);


module.exports = router;
