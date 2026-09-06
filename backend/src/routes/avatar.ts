import express from 'express';
import multer from 'multer';
import * as avatarController from '../controllers/avatarController.ts';
import requireAuth from '../middleware/requireAuth.ts';
import { authLimiter } from '../middleware/rateLimiters.ts';

// In memory, not on disk. The file is decoded, resized and re-encoded straight
// away and the original is never wanted again — writing it to disk first would
// create a window in which unvalidated bytes from the internet are sitting in
// the filesystem.
//
// The size limit is enforced here as well as in the service: multer stops
// reading at the limit, so an oversized upload is refused before it has all
// been buffered rather than after.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const router = express.Router();

// Rate limited: image processing is CPU-bound, and an unlimited endpoint that
// decodes arbitrary images is a denial-of-service invitation.
router.post('/', requireAuth, authLimiter, upload.single('avatar'), avatarController.upload);
router.delete('/', requireAuth, avatarController.remove);

export default router;
