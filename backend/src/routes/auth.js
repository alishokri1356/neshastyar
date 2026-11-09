const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const router = express.Router();

// More restrictive rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per windowMs
  handler: (req, res, _next, options) => {
    const referer = req.get('referer');
    const method = req.method;
    const route = req.originalUrl;
    
    // Extract page name from referer URL
    let pageName = 'Unknown Page';
    if (referer) {
      try {
        const url = new URL(referer);
        const pathname = url.pathname;
        
        // Map common routes to readable page names
        const pageMap = {
          '/': 'Home',
          '/home': 'Home',
          '/login': 'Login',
          '/signup': 'Sign Up',
          '/forgot-password': 'Forgot Password',
          '/reset-password': 'Reset Password',
        };
        
        // Find matching page name
        for (const [key, name] of Object.entries(pageMap)) {
          if (pathname === key || pathname.startsWith(key)) {
            pageName = name;
            break;
          }
        }
        
        // If no match found, use the pathname itself
        if (pageName === 'Unknown Page') {
          pageName = pathname || 'Unknown Page';
        }
      } catch (e) {
        // If URL parsing fails, use referer as is
        pageName = referer;
      }
    }
    
    // Build detailed error message
    const apiEndpoint = `${method} ${route}`;
    const detailedMessage = `Too many authentication attempts from this IP. Page: ${pageName}, API: ${apiEndpoint}. Please try again later.`;
    
    res.status(options.statusCode).json({
      error: 'Too many authentication attempts',
      message: detailedMessage,
      details: {
        page: pageName,
        apiEndpoint: apiEndpoint,
        route: route,
        method: method,
        referer: referer || null,
        ip: req.ip || req.connection.remoteAddress
      }
    });
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

// Apply auth rate limiting to all auth routes
router.use(authLimiter);

// POST /api/auth/google
router.post('/google', authController.googleAuth);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/signup
router.post('/signup', authController.signup);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/verify
router.post('/verify', authController.verify);

// GET /api/auth/profile - Get user profile (requires authentication)
const { authenticateToken } = require('../middleware/auth');
router.get('/profile', authenticateToken, authController.getProfile);

// PUT /api/auth/profile - Update user profile (requires authentication)
router.put('/profile', authenticateToken, authController.updateProfile);

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
      const ext = allowed[file.mimetype] || path.extname(file.originalname).toLowerCase();
      callback(null, `${req.user.sub}${ext}`);
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

// POST /api/auth/profile/logo
router.post('/profile/logo', authenticateToken, (req, res, next) => {
  logoUpload.single('logo')(req, res, (error) => {
    if (!error) return next();
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(400).json({
      error: 'Invalid logo',
      message: tooLarge ? 'حجم نشان باید کمتر از ۲ مگابایت باشد' : error.message,
    });
  });
}, authController.uploadLogo);

module.exports = router;
