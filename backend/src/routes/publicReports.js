const express = require('express');
const rateLimit = require('express-rate-limit');
const publicReportController = require('../controllers/publicReportController');

const router = express.Router();

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(publicLimiter);

// GET /api/public/reports/:token
router.get('/reports/:token', publicReportController.getReport);

// GET /api/public/logos/:userId
router.get('/logos/:userId', publicReportController.getLogo);

module.exports = router;
