const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { corsOptions, errorHandler } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const meetingRoutes = require('./routes/meetings');
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
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', emailRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/meetings', meetingRoutes);
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
