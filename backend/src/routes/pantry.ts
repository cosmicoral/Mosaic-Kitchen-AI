import express from 'express';
import * as pantryController from '../controllers/pantryController.ts';
import requireAuth from '../middleware/requireAuth.ts';

const router = express.Router();

// Applies to every route below, so no individual route can be added later
// without authentication by accident.
router.use(requireAuth);

// '/expiring' must stay above any '/:id' route: Express matches in order, and
// ':id' would otherwise swallow the literal path as an id.
router.get('/expiring', pantryController.listExpiring);
router.get('/', pantryController.list);
router.post('/', pantryController.create);
router.patch('/:id', pantryController.update);
router.delete('/:id', pantryController.remove);

export default router;