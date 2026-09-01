import type { Request, Response } from 'express';
import * as mealPlanService from '../services/mealPlanService.ts';
import { AppError } from '../types/index.ts';
import { readLocale } from '../utils/locale.ts';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function handleError(error: unknown, res: Response, context: string) {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'PROFILE_REQUIRED':
        // 409 rather than 400: the request was fine, the account is not ready.
        return res.status(409).json({ error: error.message, code: error.code });
      case 'QUOTA_EXCEEDED':
        // 402 Payment Required is the one status that says "upgrade" without
        // the client having to parse a message.
        return res.status(402).json({ error: error.message, code: error.code });
      case 'NOT_FOUND':
        return res.status(404).json({ error: error.message, code: error.code });
      case 'GENERATION_FAILED':
        // 502: this server is fine, the upstream one let us down.
        return res.status(502).json({ error: error.message, code: error.code });
      default:
        return res.status(400).json({ error: error.message, code: error.code });
    }
  }
  console.error(`${context}:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}

export async function generate(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const { mealPlan, attempts } = await mealPlanService.generate(
      req.user.id,
      undefined,
      readLocale(req.headers['accept-language'])
    );
    // attempts is returned so a rise in retries is visible without digging
    // through logs — it is the earliest signal that prompt quality has slipped.
    return res.status(201).json({ mealPlan, attempts });
  } catch (error) {
    return handleError(error, res, 'Meal plan generation error');
  }
}

export async function latest(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const mealPlan = await mealPlanService.getLatest(req.user.id);
    // null is normal for an account that has never generated one.
    return res.status(200).json({ mealPlan });
  } catch (error) {
    return handleError(error, res, 'Meal plan fetch error');
  }
}

export async function getOne(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const { id } = req.params;
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    return res.status(404).json({ error: 'Meal plan not found' });
  }

  try {
    const mealPlan = await mealPlanService.getById(id, req.user.id);
    return res.status(200).json({ mealPlan });
  } catch (error) {
    return handleError(error, res, 'Meal plan fetch error');
  }
}

export async function quota(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    return res.status(200).json({ quota: await mealPlanService.getQuota(req.user.id) });
  } catch (error) {
    return handleError(error, res, 'Quota fetch error');
  }
}
