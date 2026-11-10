const express = require('express');
const multer = require('multer');
const dictationController = require('../controllers/dictationController');
const { MAX_AUDIO_BYTES } = require('../services/dictationService');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
});

function receiveAudio(req, res, next) {
  upload.single('audio')(req, res, (error) => {
    if (!error) return next();
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      error: 'Invalid dictation upload',
      message: tooLarge ? 'فایل صوتی بیش از حد بزرگ است' : 'ارسال فایل صوتی ناموفق بود',
    });
  });
}

router.use(authenticateToken);
router.use(requireEmailVerification);

router.post('/transcribe', receiveAudio, dictationController.transcribe);

module.exports = router;
