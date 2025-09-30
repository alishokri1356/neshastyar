const userService = require('../services/userService');

// Middleware to check if user's email is verified
const requireEmailVerification = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const user = await userService.findById(userId);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User not found'
      });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address to access this feature',
        requiresVerification: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    }

    // Add user info to request for use in controllers
    req.userInfo = user;
    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({
      error: 'Verification check failed',
      message: 'An error occurred while checking email verification'
    });
  }
};

module.exports = {
  requireEmailVerification
};
