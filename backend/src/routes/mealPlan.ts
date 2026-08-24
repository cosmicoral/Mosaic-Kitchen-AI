import express from 'express';
import { createMealPlan } from '../controllers/mealPlanController.ts';

const router = express.Router();

router.post('/', createMealPlan);

export default router;
