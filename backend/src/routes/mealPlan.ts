import express from 'express';
import * as mealPlanController from '../controllers/mealPlanController.ts';
import requireAuth from '../middleware/requireAuth.ts';
import { generationLimiter } from '../middleware/rateLimiters.ts';

const router = express.Router();

router.use(requireAuth);

// Literal paths before the parameterised one, or ':id' swallows them.
router.get('/quota', mealPlanController.quota);
router.get('/latest', mealPlanController.latest);
router.get('/:id', mealPlanController.getOne);

// The only route here that spends money, so it gets its own limiter on top of
// the monthly quota: the quota stops a user overspending across the month,
// this stops a stuck button firing ten calls in ten seconds.
router.post('/', generationLimiter, mealPlanController.generate);

export default router;
