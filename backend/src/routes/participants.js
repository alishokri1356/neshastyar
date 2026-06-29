const express = require('express');
const participantController = require('../controllers/participantController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get('/', participantController.listParticipants);
router.get('/no-meetings', participantController.getMeetingsWithoutParticipants);
router.post('/', participantController.createParticipant);
router.put('/rename', participantController.renameParticipant);
router.post('/merge', participantController.mergeParticipants);
router.get('/:id/meetings', participantController.getMeetingsForParticipant);
router.get('/:id', participantController.getParticipantById);
router.put('/:id', participantController.renameParticipant);
router.delete('/:id', participantController.removeParticipant);

module.exports = router;
