import express from 'express';
import * as billingController from '../controllers/billingController.ts';
import requireAuth from '../middleware/requireAuth.ts';

const router = express.Router();

// The webhook is deliberately not on this router: it has no session, is
// authenticated by its Stripe signature instead, and needs the raw body — so
// it is mounted directly in app.ts ahead of the JSON parser.
router.use(requireAuth);

router.get('/status', billingController.status);
router.post('/checkout', billingController.checkout);
router.post('/portal', billingController.portal);

export default router;
