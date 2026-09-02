import rateLimit from 'express-rate-limit';
import type { RateLimitRequestHandler } from 'express-rate-limit';

// The integration suite makes far more auth calls than a person ever would, so
// the configured limits are raised under NODE_ENV=test. The limiters' own
// behaviour is covered separately in tests/rateLimiters.test.ts, which builds
// its own limiters through createLimiter rather than importing these.
const isTest = process.env.NODE_ENV === 'test';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

// Exported so a test can assert the production numbers are what we think they
// are. Constants that only exist inside a rateLimit() call cannot be checked,
// and a limit silently loosened during debugging is exactly the kind of change
// that ships unnoticed.
export const LIMITS = {
  auth: { windowMs: FIFTEEN_MINUTES, limit: 10 },
  oauth: { windowMs: FIFTEEN_MINUTES, limit: 20 },
  global: { windowMs: FIFTEEN_MINUTES, limit: 300 },
  generation: { windowMs: ONE_MINUTE, limit: 3 },
} as const;

export interface LimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}

// One factory so every limiter shares the same header policy and error shape.
// Without it the three would drift, and a client would have to handle two
// different 429 bodies.
export function createLimiter(options: LimiterOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    // draft-7 only: the legacy X-RateLimit-* headers duplicate the same
    // numbers in a format nothing new reads.
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: options.message },
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
  });
}

// Auth endpoints are the expensive, attackable ones: every login attempt costs
// a deliberately slow bcrypt comparison, and unlimited attempts allow
// credential stuffing. Keyed by IP.
export const authLimiter = createLimiter({
  ...LIMITS.auth,
  limit: isTest ? 10_000 : LIMITS.auth.limit,
  message: 'Too many attempts. Please try again later.',
  // A successful login should not count towards the limit, so a legitimate
  // user on a shared IP is not locked out by someone else's failures.
  skipSuccessfulRequests: true,
});

// The OAuth routes need their own limiter rather than reusing authLimiter,
// because every outcome there is a 302 — success and failure alike — and
// skipSuccessfulRequests only counts responses of 400 and above. Under the
// auth limiter an attacker could hammer the callback with forged codes
// forever without ever being throttled. This one counts every request.
export const oauthLimiter = createLimiter({
  ...LIMITS.oauth,
  limit: isTest ? 10_000 : LIMITS.oauth.limit,
  message: 'Too many sign-in attempts. Please try again later.',
});

// Broad backstop for everything else.
export const globalLimiter = createLimiter({
  ...LIMITS.global,
  limit: isTest ? 10_000 : LIMITS.global.limit,
  message: 'Too many requests. Please try again later.',
});

// Generation is slow and each call costs real money, so it gets a far tighter
// window than ordinary requests. This complements the monthly quota rather
// than duplicating it: the quota bounds spend over a month, this bounds a
// retry loop or a double-clicked button.
export const generationLimiter = createLimiter({
  ...LIMITS.generation,
  limit: isTest ? 10_000 : LIMITS.generation.limit,
  message: 'Please wait a moment before generating another plan.',
});
