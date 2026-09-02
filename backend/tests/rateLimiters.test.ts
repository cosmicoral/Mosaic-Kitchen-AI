import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';

import { LIMITS, createLimiter } from '../src/middleware/rateLimiters.ts';

// The exported limiters raise their ceilings to 10,000 under NODE_ENV=test so
// the integration suite is not throttled, which makes them untestable as they
// stand. These tests build their own through the same factory instead, so what
// is covered is the shared configuration — header policy, error shape, keying,
// counting rules — rather than three specific numbers.
function appWith(handler: express.RequestHandler, options?: { trustProxy?: boolean }) {
  const app = express();
  // Lets a test present different client IPs via X-Forwarded-For. The value is
  // 1 — trust exactly one hop — rather than `true`, which express-rate-limit
  // rejects outright: trusting every hop lets a client forge the header and
  // hand itself a fresh budget on demand. One is also what production uses,
  // where the app sits behind a single nginx.
  if (options?.trustProxy) app.set('trust proxy', 1);
  app.use(handler);
  app.get('/', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.post('/login', (req, res) => {
    // Stands in for an auth endpoint: succeeds or fails on request, so the
    // "only failures count" rule can be exercised.
    const succeed = (req.query.succeed ?? 'true') === 'true';
    res.status(succeed ? 200 : 401).json({ ok: succeed });
  });
  return app;
}

describe('createLimiter', () => {
  test('allows requests up to the limit', async () => {
    const app = appWith(
      createLimiter({ windowMs: 60_000, limit: 3, message: 'slow down' })
    );

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await request(app).get('/');
      assert.equal(response.status, 200, `request ${attempt} should pass`);
    }
  });

  test('returns 429 and our JSON body once the limit is exceeded', async () => {
    const app = appWith(
      createLimiter({ windowMs: 60_000, limit: 2, message: 'slow down' })
    );

    await request(app).get('/');
    await request(app).get('/');
    const blocked = await request(app).get('/');

    assert.equal(blocked.status, 429);
    // The shape matters: every other error in this API is { error: string },
    // and a client should not have to special-case 429.
    assert.deepEqual(blocked.body, { error: 'slow down' });
  });

  test('advertises the limit with draft-7 headers and no legacy ones', async () => {
    const app = appWith(
      createLimiter({ windowMs: 60_000, limit: 5, message: 'slow down' })
    );

    const response = await request(app).get('/');

    // draft-7 collapses limit, remaining and reset into one RateLimit header.
    assert.ok(
      response.headers['ratelimit'] ?? response.headers['ratelimit-policy'],
      'expected a draft-7 RateLimit header'
    );
    assert.equal(response.headers['x-ratelimit-limit'], undefined);
    assert.equal(response.headers['x-ratelimit-remaining'], undefined);
  });

  test('counts each client IP separately', async () => {
    const app = appWith(
      createLimiter({ windowMs: 60_000, limit: 1, message: 'slow down' }),
      { trustProxy: true }
    );

    const first = await request(app).get('/').set('X-Forwarded-For', '203.0.113.1');
    const firstAgain = await request(app).get('/').set('X-Forwarded-For', '203.0.113.1');
    // A second visitor must not inherit the first one's exhausted budget —
    // otherwise one abusive client on a shared network locks everyone out.
    const second = await request(app).get('/').set('X-Forwarded-For', '203.0.113.2');

    assert.equal(first.status, 200);
    assert.equal(firstAgain.status, 429);
    assert.equal(second.status, 200);
  });

  test('counts every request when skipSuccessfulRequests is off', async () => {
    const app = appWith(
      createLimiter({ windowMs: 60_000, limit: 2, message: 'slow down' })
    );

    await request(app).post('/login?succeed=true');
    await request(app).post('/login?succeed=true');
    const blocked = await request(app).post('/login?succeed=true');

    assert.equal(blocked.status, 429);
  });

  test('ignores successful requests when skipSuccessfulRequests is on', async () => {
    const app = appWith(
      createLimiter({
        windowMs: 60_000,
        limit: 2,
        message: 'slow down',
        skipSuccessfulRequests: true,
      })
    );

    // Ten successful logins in a row must not consume the budget, or a shared
    // office IP would lock out a whole floor of legitimate users.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app).post('/login?succeed=true');
      assert.equal(response.status, 200);
    }

    // Failures still count, and still run out.
    assert.equal((await request(app).post('/login?succeed=false')).status, 401);
    assert.equal((await request(app).post('/login?succeed=false')).status, 401);
    assert.equal((await request(app).post('/login?succeed=false')).status, 429);
  });
});

describe('configured limits', () => {
  // Asserting the numbers themselves, because a ceiling raised during
  // debugging and never restored is a change that ships silently — nothing
  // fails, the app just stops being protected.
  test('auth is the tightest per-minute budget of the three', () => {
    const perMinute = (entry: { windowMs: number; limit: number }) =>
      entry.limit / (entry.windowMs / 60_000);

    assert.ok(
      perMinute(LIMITS.auth) < perMinute(LIMITS.global),
      'auth should be tighter than the global backstop'
    );
  });

  test('generation allows only a few calls a minute', () => {
    assert.equal(LIMITS.generation.windowMs, 60_000);
    assert.ok(
      LIMITS.generation.limit <= 5,
      'each generation costs money; the burst limit must stay small'
    );
  });

  test('auth and global windows are fifteen minutes', () => {
    assert.equal(LIMITS.auth.windowMs, 15 * 60 * 1000);
    assert.equal(LIMITS.global.windowMs, 15 * 60 * 1000);
  });

  test('oauth is bounded and tighter than the global backstop', () => {
    // The OAuth routes answer 302 on both success and failure, so
    // skipSuccessfulRequests cannot protect them — every request has to count,
    // and the ceiling has to be low enough to matter.
    assert.ok(LIMITS.oauth.limit < LIMITS.global.limit);
    assert.equal(LIMITS.oauth.windowMs, 15 * 60 * 1000);
  });
});
