import express from 'express';
import * as accountController from '../controllers/accountController.ts';
import requireAuth from '../middleware/requireAuth.ts';
import { authLimiter } from '../middleware/rateLimiters.ts';

const router = express.Router();

router.get('/', requireAuth, accountController.overview);
router.get('/export', requireAuth, accountController.exportData);

// Rate limited like login is. Both take a password and tell you whether it was
// right, so both are somewhere an attacker with a stolen session would guess.
router.post('/password', requireAuth, authLimiter, accountController.changePassword);

// POST, not DELETE, because it carries a confirmation body. Some proxies strip
// bodies from DELETE, and losing the confirmation would turn a deliberate act
// into a one-click one.
router.post('/delete', requireAuth, authLimiter, accountController.deleteAccount);

export default router;
