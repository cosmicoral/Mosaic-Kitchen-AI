import express from 'express';
import * as authController from '../controllers/authController.ts';
import * as oauthController from '../controllers/oauthController.ts';
import requireAuth from '../middleware/requireAuth.ts';
import { authLimiter, oauthLimiter } from '../middleware/rateLimiters.ts';

const router = express.Router();

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

// Parameterised by provider so adding Apple later is a provider entry rather
// than a second pair of routes. Registered after /me, or ':provider' would
// swallow it.
router.get('/:provider/callback', oauthLimiter, oauthController.callback);
router.get('/:provider', oauthLimiter, oauthController.start);

export default router;
