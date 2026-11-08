const express = require('express');
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

router.use(authenticateToken);
router.use(requireEmailVerification);

router.get('/', chatController.listSessions);
router.post('/', chatController.createSession);
router.get('/:id', chatController.getSession);
router.delete('/:id', chatController.deleteSession);
router.post('/:id/messages', chatController.sendMessage);

module.exports = router;
