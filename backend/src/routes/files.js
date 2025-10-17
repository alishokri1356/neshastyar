const express = require('express');
const { FileController, upload } = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

// Get audio file (public access with token) - NO AUTH MIDDLEWARE
router.get('/audio/:userId/:filename', FileController.getPublicAudio);

// Download audio by meeting ID (public access) - NO AUTH MIDDLEWARE
router.get('/download/audio/:meetingId', FileController.downloadAudioByMeetingId);

// All other routes require authentication and email verification
router.use(authenticateToken);
router.use(requireEmailVerification);

// Upload audio file
router.post('/upload/audio', upload.single('audio'), FileController.uploadAudio);

// Get audio file
router.get('/files/audio/:userId/:filename', FileController.getAudio);

// Get audio files for a meeting
router.get('/meetings/:meetingId/audio-files', FileController.getMeetingAudioFiles);

// Delete audio file
router.delete('/files/audio/:userId/:filename', FileController.deleteAudio);

module.exports = router;
