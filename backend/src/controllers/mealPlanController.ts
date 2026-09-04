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

// Same work as generate(), reported as it happens. Deliberately a second
// endpoint over the same service rather than a replacement: the plain POST
// stays the contract for anything that cannot read a stream (curl, the iOS
// client later, a retry from a background job), and two paths through one
// service cannot drift in behaviour.
export async function generateStream(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Nginx buffers proxied responses by default, which would hold every
    // event until the request finished and defeat the entire point. This
    // header turns it off for this response even when the server config has
    // not been updated.
    'X-Accel-Buffering': 'no',
  });

  function send(event: string, data: unknown) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // A comment line, which SSE ignores. It forces the headers and the first
  // bytes out through any intermediary that is waiting for content before it
  // commits to the response.
  res.write(': open\n\n');

  // If the user navigates away mid-generation the model call keeps running to
  // completion on purpose — it has already been paid for, and the finished
  // plan is saved and waiting when they come back.
  let clientGone = false;
  req.on('close', () => {
    clientGone = true;
  });

  try {
    const { mealPlan, attempts } = await mealPlanService.generate(
      req.user.id,
      undefined,
      readLocale(req.headers['accept-language']),
      (event) => {
        if (!clientGone) send('stage', event);
      }
    );

    if (!clientGone) {
      send('done', { mealPlan, attempts });
    }
  } catch (error) {
    if (!clientGone) {
      // Errors travel as an event, not a status code: the 200 went out with
      // the headers before any of this work started, so the code is already
      // spent by the time anything can fail.
      const isAppError = error instanceof AppError;
      if (!isAppError) console.error('Meal plan stream error:', error);

      send('failed', {
        error: isAppError ? error.message : 'Internal server error',
        code: isAppError ? error.code : null,
      });
    }
  } finally {
    res.end();
  }
}

export async function cookFromPantry(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const itemIds = (req.body as { item_ids?: unknown } | undefined)?.item_ids;
  if (!Array.isArray(itemIds) || itemIds.some((id) => typeof id !== 'string')) {
    return res.status(400).json({ error: 'item_ids must be an array of ids' });
  }

  try {
    const { mealPlan, attempts } = await mealPlanService.generateFromPantry(
      req.user.id,
      itemIds as string[],
      undefined,
      readLocale(req.headers['accept-language'])
    );
    return res.status(201).json({ mealPlan, attempts });
  } catch (error) {
    return handleError(error, res, 'Pantry cook error');
  }
}

export async function latestPantryCook(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const mealPlan = await mealPlanService.getLatestPantryCook(req.user.id);
    return res.status(200).json({ mealPlan });
  } catch (error) {
    return handleError(error, res, 'Pantry cook fetch error');
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
