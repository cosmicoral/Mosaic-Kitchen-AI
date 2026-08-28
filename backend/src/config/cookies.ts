import type { CookieOptions } from 'express';
import { SESSION_TTL_DAYS } from '../services/authService.ts';

export const SESSION_COOKIE_NAME = 'mk_session';

const isProduction = process.env.NODE_ENV === 'production';

// 'lax' whenever the browser considers the site and the API same-site, which
// includes subdomains of one registrable domain (example.com talking to
// api.example.com). Only a genuinely different registrable domain — a Vercel
// URL calling an onrender.com URL, say — needs 'none', and 'none' throws away
// the CSRF protection Lax gives for free. Set COOKIE_SAMESITE=none only if the
// deployment really is cross-site.
//
// Note that same-site is not the same as same-origin: subdomains are still
// cross-origin, so CORS is required either way.
const sameSite = process.env.COOKIE_SAMESITE === 'none' ? 'none' : 'lax';

// httpOnly - JavaScript cannot read it, so XSS cannot steal the session.
// secure   - only sent over HTTPS. Off in dev because localhost is plain HTTP,
//            and a secure cookie there would never be sent at all.
// maxAge   - matches the DB expiry so the browser and the database agree.
//
// The CookieOptions annotation is what keeps `sameSite` narrowed to the literal
// union express expects; without it TypeScript widens the ternary to `string`.
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? sameSite : 'lax',
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  path: '/',
};

// Clearing must repeat the same attributes (minus maxAge) or the browser will
// not recognise it as the same cookie.
export const clearCookieOptions: CookieOptions = {
  httpOnly: sessionCookieOptions.httpOnly,
  secure: sessionCookieOptions.secure,
  sameSite: sessionCookieOptions.sameSite,
  path: sessionCookieOptions.path,
};
