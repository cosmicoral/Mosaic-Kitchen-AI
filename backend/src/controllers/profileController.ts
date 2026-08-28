import type { Request, Response } from 'express';
import * as profileService from '../services/profileService.ts';
import { AppError } from '../types/index.ts';

function handleError(error: unknown, res: Response, context: string) {
  if (error instanceof AppError && error.code === 'VALIDATION_ERROR') {
    return res.status(400).json({ error: error.message });
  }
  console.error(`${context}:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}

export async function get(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const profile = await profileService.getProfile(req.user.id);
    // 200 with null rather than 404: "this user has not filled in onboarding"
    // is a normal state, not a missing resource. A 404 would make the frontend
    // treat a fresh account as an error.
    return res.status(200).json({ profile });
  } catch (error) {
    return handleError(error, res, 'Profile fetch error');
  }
}

export async function save(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const profile = await profileService.saveProfile(req.user.id, req.body);
    return res.status(200).json({ profile });
  } catch (error) {
    return handleError(error, res, 'Profile save error');
  }
}