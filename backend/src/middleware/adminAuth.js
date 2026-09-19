const authService = require('../services/authService');

function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin authentication required',
      });
    }

    const payload = authService.verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }

    req.admin = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired admin token',
    });
  }
}

module.exports = { requireAdmin };
