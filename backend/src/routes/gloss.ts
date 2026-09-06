import express from 'express';
import * as glossController from '../controllers/glossController.ts';
import requireAuth from '../middleware/requireAuth.ts';
import { generationLimiter } from '../middleware/rateLimiters.ts';

const router = express.Router();

// Rate limited with the generation routes rather than the read routes: a miss
// costs a model call, so this is a spending endpoint wearing a lookup's
// clothes.
router.post('/', requireAuth, generationLimiter, glossController.gloss);

export default router;
