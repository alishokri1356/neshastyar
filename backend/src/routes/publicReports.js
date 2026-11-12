const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const publicReportController = require('../controllers/publicReportController');
const reportService = require('../services/reportService');

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

// PATCH /api/public/reports/:token
router.patch('/reports/:token', publicReportController.updateReport);

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      const dir = path.join(process.cwd(), 'uploads', 'logos');
      fs.mkdirSync(dir, { recursive: true });
      callback(null, dir);
    },
    filename: (req, file, callback) => {
      const allowed = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
      };
      const ext = allowed[file.mimetype];
      if (!ext) {
        callback(new Error('فقط تصویر PNG، JPG، WEBP یا SVG مجاز است'));
        return;
      }
      reportService.loadEditableMeeting(req.params.token)
        .then((meeting) => {
          if (!meeting) {
            callback(new Error('این صورتجلسه پیدا نشد'));
            return;
          }
          if (Number(meeting.share_can_edit) === 0) {
            callback(new Error('ویرایش این صورتجلسه برای دارنده لینک بسته است'));
            return;
          }
          callback(null, `${meeting.user_id}-${Date.now()}${ext}`);
        })
        .catch((error) => callback(error));
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) {
      callback(new Error('فقط تصویر PNG، JPG، WEBP یا SVG مجاز است'));
      return;
    }
    callback(null, true);
  },
});

router.post('/reports/:token/logo', (req, res, next) => {
  logoUpload.single('logo')(req, res, (error) => {
    if (!error) return next();
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(400).json({
      error: 'Invalid logo',
      message: tooLarge ? 'حجم لوگو باید کمتر از ۲ مگابایت باشد' : error.message,
    });
  });
}, publicReportController.uploadLogo);

// GET /api/public/logos/:userId
router.get('/logos/:userId', publicReportController.getLogo);

module.exports = router;
