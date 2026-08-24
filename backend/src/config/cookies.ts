import type { CookieOptions } from 'express';
import { SESSION_TTL_DAYS } from '../services/authService.ts';

export const SESSION_COOKIE_NAME = 'mk_session';

const isProduction = process.env.NODE_ENV === 'production';

// httpOnly  - JavaScript cannot read it, so XSS cannot steal the session.
// secure    - only sent over HTTPS. Disabled in dev because localhost is HTTP.
// sameSite  - 'lax' is fine while the API and site share a site in production;
//             a cross-site setup (api.example.com + app.example.com counts as
//             same-site, but a different registrable domain does not) needs
//             'none', which in turn requires secure: true.
// maxAge    - matches the DB expiry so the browser and the database agree.
//
// The CookieOptions annotation is what keeps `sameSite` narrowed to the literal
// union express expects; without it TypeScript widens the ternary to `string`.
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
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
