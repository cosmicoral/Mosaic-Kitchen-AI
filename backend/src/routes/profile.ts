import express from 'express';
import * as profileController from '../controllers/profileController.ts';
import requireAuth from '../middleware/requireAuth.ts';

const router = express.Router();

router.use(requireAuth);

router.get('/', profileController.get);
// PUT, not PATCH: onboarding and the profile screen both submit the whole
// thing, and the repository upserts the complete row.
router.put('/', profileController.save);

export default router;