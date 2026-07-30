const express = require('express');
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
