import rateLimit from 'express-rate-limit';

// The integration suite makes far more than 10 auth calls, so the limits are
// raised under NODE_ENV=test. Consequence: rate limiting itself is not covered
// by the suite and has to be verified by hand.
const isTest = process.env.NODE_ENV === 'test';

// Auth endpoints are the expensive, attackable ones: every login attempt costs
// a deliberately slow bcrypt comparison, and unlimited attempts allow
// credential stuffing. Keyed by IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10_000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
  // Successful logins should not count towards the limit, so a legitimate
  // user on a shared IP is not locked out by someone else's failures.
  skipSuccessfulRequests: true,
});

// Broad backstop for everything else.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10_000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
