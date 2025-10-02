const authService = require('../services/authService');

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Access token required' 
    });
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Invalid token',
      message: 'Invalid or expired token' 
    });
  }
};

// Middleware to validate request body
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }
    next();
  };
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials'
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'Resource already exists'
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      error: 'Foreign key constraint',
      message: 'Referenced resource does not exist'
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// CORS middleware
const corsOptions = {
  origin: [
    // Production
    'https://modiryar.online',
    'http://modiryar.online',
    // Development
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081', 
    'http://localhost:8082',
    'http://localhost:8083',
    'http://localhost:8084',
    'http://localhost:8085'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  authenticateToken,
  validateRequest,
  errorHandler,
  corsOptions
};
