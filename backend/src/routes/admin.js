const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

router.post('/login', (req, res) => adminController.login(req, res));
router.get('/me', requireAdmin, (req, res) => adminController.me(req, res));
router.get('/users', requireAdmin, (req, res) => adminController.listUsers(req, res));
router.get('/users/:id', requireAdmin, (req, res) => adminController.getUser(req, res));
router.patch('/users/:id', requireAdmin, (req, res) => adminController.updateUser(req, res));
router.post('/users/:id/resend-verification', requireAdmin, (req, res) =>
  adminController.resendVerification(req, res)
);
router.post('/users/:id/resend-password-reset', requireAdmin, (req, res) =>
  adminController.resendPasswordReset(req, res)
);

module.exports = router;
