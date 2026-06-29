const express = require('express');
const meetingParticipantController = require('../controllers/meetingParticipantController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get('/meetings/:meetingId/participants', meetingParticipantController.getParticipantsForMeeting);
router.post('/', meetingParticipantController.createMeetingParticipant);
router.delete('/', meetingParticipantController.deleteMeetingParticipant);
router.delete('/:id', meetingParticipantController.deleteMeetingParticipantById);

module.exports = router;
