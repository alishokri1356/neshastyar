const express = require('express');
const participantController = require('../controllers/participantController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get('/', participantController.listParticipants);
router.put('/rename', participantController.renameParticipant);
router.delete('/:name', participantController.removeParticipant);

module.exports = router;
