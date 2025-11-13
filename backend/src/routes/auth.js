const express = require('express');
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

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/signup
router.post('/signup', authController.signup);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/verify
router.post('/verify', authController.verify);

module.exports = router;
