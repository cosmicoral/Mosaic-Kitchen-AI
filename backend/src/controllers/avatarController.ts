import type { Request, Response } from 'express';
import * as avatarService from '../services/avatarService.ts';
import { AppError } from '../types/index.ts';

// req.file is typed by @types/multer; no local shim needed.
export async function upload(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No image was uploaded' });

  try {
    const result = await avatarService.uploadAvatar(req.user.id, file.buffer);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    console.error('Avatar upload failed:', error);
    return res.status(500).json({ error: 'Could not save that image' });
  }
}

export async function remove(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    await avatarService.removeAvatar(req.user.id);
    return res.status(204).end();
  } catch (error) {
    console.error('Avatar removal failed:', error);
    return res.status(500).json({ error: 'Could not remove your picture' });
  }
}
