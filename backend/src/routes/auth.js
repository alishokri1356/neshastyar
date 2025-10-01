const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const router = express.Router();

// More restrictive rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts from this IP, please try again later.'
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

// Apply auth rate limiting to all auth routes
router.use(authLimiter);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/signup
router.post('/signup', authController.signup);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/verify
router.post('/verify', authController.verify);

module.exports = router;
