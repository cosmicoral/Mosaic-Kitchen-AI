import express from 'express';
import * as mealPlanController from '../controllers/mealPlanController.ts';
import requireAuth from '../middleware/requireAuth.ts';
import { generationLimiter } from '../middleware/rateLimiters.ts';

const router = express.Router();

router.use(requireAuth);

// Literal paths before the parameterised one, or ':id' swallows them.
router.get('/quota', mealPlanController.quota);
router.get('/latest', mealPlanController.latest);
router.get('/pantry-cook/latest', mealPlanController.latestPantryCook);
router.get('/:id', mealPlanController.getOne);

// The only route here that spends money, so it gets its own limiter on top of
// the monthly quota: the quota stops a user overspending across the month,
// this stops a stuck button firing ten calls in ten seconds.
router.post('/', generationLimiter, mealPlanController.generate);

// Same limiter as the plain POST — it is the same spend, just narrated.
router.post('/stream', generationLimiter, mealPlanController.generateStream);

// Cheaper than a weekly plan but still a paid model call, so it sits behind
// the same burst limiter. Its monthly allowance is separate and far larger.
router.post('/pantry-cook', generationLimiter, mealPlanController.cookFromPantry);
router.post('/pantry-cook/stream', generationLimiter, mealPlanController.cookFromPantryStream);

export default router;
