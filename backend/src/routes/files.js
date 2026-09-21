const express = require('express');
const { FileController, upload } = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

// Get audio file (public access with token) - NO AUTH MIDDLEWARE
router.get('/audio/:userId/:filename', FileController.getPublicAudio);

// Download audio by audio file ID (public access) - NO AUTH MIDDLEWARE
router.get('/audio/:audioFileId', FileController.downloadAudioByFileId);

// Download audio by meeting ID (public access) - NO AUTH MIDDLEWARE
router.get('/download/audio/:meetingId', FileController.downloadAudioByMeetingId);

// All other routes require authentication and email verification
router.use(authenticateToken);
router.use(requireEmailVerification);

// Upload audio file (single request, kept for compatibility)
router.post('/upload/audio', upload.single('audio'), FileController.uploadAudio);

// Resumable chunked upload
router.post('/upload/sessions', (req, res) => FileController.createUploadSession(req, res));
router.get('/upload/sessions/:uploadId', (req, res) => FileController.getUploadSession(req, res));
router.patch('/upload/sessions/:uploadId', (req, res) => FileController.appendUploadChunk(req, res));
router.post('/upload/sessions/:uploadId/complete', (req, res) => FileController.completeUploadSession(req, res));
router.delete('/upload/sessions/:uploadId', (req, res) => FileController.deleteUploadSession(req, res));

// Get audio file
router.get('/files/audio/:userId/:filename', FileController.getAudio);

// Get audio files for a meeting
router.get('/meetings/:meetingId/audio-files', FileController.getMeetingAudioFiles);

// Create audio file record
router.post('/audio-files', FileController.createAudioFile);

// Delete audio file
router.delete('/files/audio/:userId/:filename', FileController.deleteAudio);

module.exports = router;
