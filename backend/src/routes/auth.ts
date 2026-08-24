import express from 'express';
import * as authController from '../controllers/authController.ts';
import requireAuth from '../middleware/requireAuth.ts';
import { authLimiter } from '../middleware/rateLimiters.ts';

const router = express.Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
