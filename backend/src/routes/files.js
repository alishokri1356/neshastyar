const express = require('express');
const { FileController, upload } = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

// All routes require authentication and email verification
router.use(authenticateToken);
router.use(requireEmailVerification);

// Upload audio file
router.post('/upload/audio', upload.single('audio'), FileController.uploadAudio);

// Get audio file
router.get('/files/audio/:userId/:filename', FileController.getAudio);

// Delete audio file
router.delete('/files/audio/:userId/:filename', FileController.deleteAudio);

module.exports = router;
