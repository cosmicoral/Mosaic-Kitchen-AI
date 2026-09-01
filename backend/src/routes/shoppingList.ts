import express from 'express';
import * as shoppingListController from '../controllers/shoppingListController.ts';
import requireAuth from '../middleware/requireAuth.ts';

const router = express.Router();

router.use(requireAuth);

router.get('/', shoppingListController.list);
// POST rather than GET: it replaces rows, so it must not be something a
// browser or a prefetcher can trigger by navigation.
router.post('/generate', shoppingListController.generate);
router.delete('/checked', shoppingListController.clearChecked);

router.post('/items', shoppingListController.addItem);
router.patch('/items/:id', shoppingListController.updateItem);
router.delete('/items/:id', shoppingListController.removeItem);

export default router;