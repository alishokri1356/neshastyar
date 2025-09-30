const express = require('express');
const tagController = require('../controllers/tagController');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

const router = express.Router();

// All routes require authentication and email verification
router.use(authenticateToken);
router.use(requireEmailVerification);

// GET /api/tags
router.get('/', tagController.getTags);

// GET /api/tags/:id
router.get('/:id', tagController.getTagById);

// GET /api/tags/:id/meetings
router.get('/:id/meetings', tagController.getMeetingsByTag);

// POST /api/tags
router.post('/', tagController.createTag);

// PUT /api/tags/:id
router.put('/:id', tagController.updateTag);

// DELETE /api/tags/:id
router.delete('/:id', tagController.deleteTag);

module.exports = router;
