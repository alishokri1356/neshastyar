const express = require('express');
const participantController = require('../controllers/participantController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.put('/rename', participantController.renameParticipant);

module.exports = router;
