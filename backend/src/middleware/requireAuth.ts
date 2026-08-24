import type { NextFunction, Request, Response } from 'express';
import * as authService from '../services/authService.ts';
import { SESSION_COOKIE_NAME } from '../config/cookies.ts';

// Attaches req.user when the request carries a valid, unexpired session
// cookie. Any route mounted behind this middleware can assume req.user exists.
//
// `user` and `sessionId` are added to express's Request by declaration merging
// in src/types/express.d.ts.
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    const user = await authService.getSessionUser(sessionId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = user;
    req.sessionId = sessionId;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth;
