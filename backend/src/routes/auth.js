const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/signup
router.post('/signup', authController.signup);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/verify
router.post('/verify', authController.verify);

module.exports = router;
