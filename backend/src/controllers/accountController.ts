import type { Request, Response } from 'express';
import * as accountService from '../services/accountService.ts';
import { AppError } from '../types/index.ts';
import { SESSION_COOKIE_NAME, clearCookieOptions } from '../config/cookies.ts';

const STATUS_FOR_CODE: Record<string, number> = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  PASSWORD_LOGIN_UNAVAILABLE: 409,
  NOT_FOUND: 404,
};

function fail(res: Response, error: unknown, fallback: string) {
  if (error instanceof AppError) {
    return res
      .status(STATUS_FOR_CODE[error.code] ?? 400)
      .json({ error: error.message, code: error.code });
  }
  console.error(`${fallback}:`, error);
  return res.status(500).json({ error: fallback });
}

export async function overview(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    return res.status(200).json({ account: await accountService.getOverview(req.user.id) });
  } catch (error) {
    return fail(res, error, 'Could not load your account');
  }
}

export async function changePassword(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const body = (req.body ?? {}) as Record<string, unknown>;

  try {
    await accountService.changePassword(
      req.user.id,
      body.current_password,
      body.new_password
    );
    return res.status(204).end();
  } catch (error) {
    return fail(res, error, 'Could not change your password');
  }
}

export async function exportData(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const data = await accountService.exportData(req.user.id);

    // Sent as a download rather than a JSON body the browser renders, because
    // the point of the export is to end up as a file the person keeps.
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mosaic-kitchen-data-${new Date().toISOString().slice(0, 10)}.json"`
    );
    return res.status(200).send(JSON.stringify(data, null, 2));
  } catch (error) {
    return fail(res, error, 'Could not export your data');
  }
}

export async function deleteAccount(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const body = (req.body ?? {}) as Record<string, unknown>;

  try {
    await accountService.deleteAccount(req.user.id, body.confirm_email);

    // The session row went with the user via CASCADE, so the cookie now points
    // at nothing. Clearing it means the browser stops sending a dead session
    // rather than being silently logged out on the next request.
    res.clearCookie(SESSION_COOKIE_NAME, clearCookieOptions);
    return res.status(204).end();
  } catch (error) {
    return fail(res, error, 'Could not delete your account');
  }
}
