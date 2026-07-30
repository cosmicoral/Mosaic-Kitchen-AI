const rateLimit = require('express-rate-limit');

// Auth endpoints are the expensive, attackable ones: every login attempt costs
// a deliberately slow bcrypt comparison, and unlimited attempts allow
// credential stuffing. Keyed by IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
  // Successful logins should not count towards the limit, so a legitimate
  // user on a shared IP is not locked out by someone else's failures.
  skipSuccessfulRequests: true,
});

// Broad backstop for everything else.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

module.exports = { authLimiter, globalLimiter };
