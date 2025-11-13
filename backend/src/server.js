const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { corsOptions, errorHandler } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const webhookRoutes = require('./routes/webhook');
const meetingRoutes = require('./routes/meetings');
const participantRoutes = require('./routes/participants');
const tagRoutes = require('./routes/tags');
const meetingTagRoutes = require('./routes/meetingTags');
const fileRoutes = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting (required when behind reverse proxy like Nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // limit each IP to 500 requests per windowMs
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
          '/tags': 'Tag List',
          '/tag/': 'Tag Detail',
          '/tags/manage': 'Tag Management',
          '/meetings': 'Meetings',
          '/meeting/': 'Meeting Detail',
          '/meetings/untagged': 'Untagged Meetings',
          '/participants': 'Participants',
          '/participant/': 'Participant Detail',
          '/participants/manage': 'Participant Management',
          '/record': 'Record Meeting',
          '/tag-selection': 'Tag Selection',
          '/login': 'Login',
          '/signup': 'Sign Up',
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
    const detailedMessage = `Too many requests from this IP. Page: ${pageName}, API: ${apiEndpoint}. Please try again later.`;
    
    res.status(options.statusCode).json({
      error: 'Too many requests',
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
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Webhook routes (no authentication required) - MUST be before 404 handler
app.use('/', webhookRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', emailRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/meeting-tags', meetingTagRoutes);
app.use('/api', fileRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
