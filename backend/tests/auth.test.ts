import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.ts';
import { SESSION_COOKIE_NAME } from '../src/config/cookies.ts';
import {
  closeDb,
  countSessions,
  findUserRow,
  insertSession,
  resetDb,
} from './helpers/db.ts';

const EMAIL = 'coral@example.com';
const PASSWORD = 'Supersecret123!';

// supertest gives back the raw Set-Cookie header; these pull out the bits the
// assertions care about.
function getSetCookie(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function sessionCookieHeader(res: request.Response): string | undefined {
  return getSetCookie(res).find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
}

function sessionIdFrom(res: request.Response): string {
  const header = sessionCookieHeader(res);
  assert.ok(header, 'expected a session cookie to be set');
  const value = header.split(';')[0]?.split('=')[1];
  assert.ok(value, 'expected the session cookie to have a value');
  return value;
}

async function signup(email = EMAIL, password = PASSWORD) {
  return request(app).post('/api/auth/signup').send({ email, password });
}

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await closeDb();
});

describe('POST /api/auth/signup', () => {
  test('creates a user, returns 201 and starts a session', async () => {
    const res = await signup();

    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, EMAIL);
    assert.match(res.body.user.id, /^[0-9a-f-]{36}$/);
    assert.ok(sessionCookieHeader(res), 'signup should log the user in');
  });

  test('never returns the password hash', async () => {
    const res = await signup();
    assert.equal(res.body.user.password_hash, undefined);
    assert.ok(!JSON.stringify(res.body).includes('$2b$'));
  });

  test('stores a bcrypt hash rather than the plaintext password', async () => {
    await signup();

    const row = await findUserRow(EMAIL);
    assert.ok(row);
    assert.notEqual(row.password_hash, PASSWORD);
    // $2b$ is the bcrypt identifier, 12 the cost factor set in authService.
    assert.match(row.password_hash, /^\$2b\$12\$/);
  });

  test('sets an httpOnly session cookie', async () => {
    const header = sessionCookieHeader(await signup());
    assert.ok(header);
    assert.match(header, /HttpOnly/i);
  });

  test('normalises the email so case and whitespace do not create duplicates', async () => {
    const res = await signup('  Coral@Example.COM  ');

    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, EMAIL);

    const duplicate = await signup(EMAIL);
    assert.equal(duplicate.status, 409);
  });

  test('rejects a duplicate email with 409', async () => {
    await signup();
    const res = await signup();

    assert.equal(res.status, 409);
    assert.equal(res.body.error, 'Email already registered');
  });

  test('rejects a password shorter than 8 characters with 400', async () => {
    const res = await signup('short@example.com', '123');

    assert.equal(res.status, 400);
    assert.match(res.body.error, /at least 8 characters/);
    assert.equal(await findUserRow('short@example.com'), null);
  });

  test('rejects passwords missing a required character class with 400', async () => {
    const cases = [
      ['NOLOWERCASE1!', /lowercase/],
      ['nouppercase1!', /uppercase/],
      ['NoNumber!', /number/],
      ['NoSpecial1', /special/],
    ] as const;

    for (const [password, message] of cases) {
      const res = await signup(`invalid-${password.length}-${message.source}@example.com`, password);
      assert.equal(res.status, 400);
      assert.match(res.body.error, message);
    }
  });

  test('rejects a malformed email with 400', async () => {
    const res = await signup('not-an-email', PASSWORD);

    assert.equal(res.status, 400);
    assert.match(res.body.error, /valid email/i);
  });

  test('rejects a missing password with 400', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: EMAIL });
    assert.equal(res.status, 400);
  });

  test('rejects non-string credentials with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 123, password: true });
    assert.equal(res.status, 400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await signup();
  });

  test('returns 200 and a fresh session for correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, EMAIL);
    assert.ok(sessionCookieHeader(res));
  });

  test('issues a session id different from the signup one', async () => {
    const first = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });
    const second = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    assert.notEqual(sessionIdFrom(first), sessionIdFrom(second));
  });

  test('accepts a differently-cased email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'CORAL@EXAMPLE.COM', password: PASSWORD });

    assert.equal(res.status, 200);
  });

  test('rejects a wrong password with 401 and no cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: 'wrongpassword' });

    assert.equal(res.status, 401);
    assert.equal(sessionCookieHeader(res), undefined);
  });

  // The point of this pair is that an attacker cannot tell the two apart, so
  // the API cannot be used to discover which addresses are registered.
  test('returns an identical response for an unknown email and a wrong password', async () => {
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD });
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: 'wrongpassword' });

    assert.equal(unknown.status, wrongPassword.status);
    assert.deepEqual(unknown.body, wrongPassword.body);
  });
});

describe('GET /api/auth/me', () => {
  test('returns the current user when a valid session cookie is sent', async () => {
    const signupRes = await signup();
    const cookie = sessionCookieHeader(signupRes);
    assert.ok(cookie);

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, EMAIL);
    assert.equal(res.body.user.id, signupRes.body.user.id);
  });

  test('returns 401 without a cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('returns 401 for a session id that does not exist', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${SESSION_COOKIE_NAME}=deadbeef`);

    assert.equal(res.status, 401);
  });

  // Covers the `expires_at > now()` filter in sessionRepository: the row is
  // present but must not authenticate.
  test('returns 401 for a session that has expired', async () => {
    const signupRes = await signup();
    const userId: string = signupRes.body.user.id;
    const expiredId = 'expired-session-id';

    await insertSession(expiredId, userId, new Date(Date.now() - 1000));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${expiredId}`);

    assert.equal(res.status, 401);
  });
});

describe('POST /api/auth/logout', () => {
  test('returns 204, deletes the session row and clears the cookie', async () => {
    const signupRes = await signup();
    const cookie = sessionCookieHeader(signupRes);
    assert.ok(cookie);
    const userId: string = signupRes.body.user.id;

    assert.equal(await countSessions(userId), 1);

    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    assert.equal(res.status, 204);
    assert.equal(await countSessions(userId), 0);

    const cleared = sessionCookieHeader(res);
    assert.ok(cleared);
    // Deleting a cookie means resending it empty with an expiry in the past.
    assert.match(cleared, new RegExp(`^${SESSION_COOKIE_NAME}=;`));
  });

  test('makes the old cookie unusable', async () => {
    const cookie = sessionCookieHeader(await signup());
    assert.ok(cookie);

    await request(app).post('/api/auth/logout').set('Cookie', cookie);
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);

    assert.equal(res.status, 401);
  });

  test('is idempotent when no session is present', async () => {
    const res = await request(app).post('/api/auth/logout');
    assert.equal(res.status, 204);
  });
});

describe('security headers and CORS', () => {
  test('helmet sets its defensive headers', async () => {
    const res = await request(app).get('/');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
  });

  test('an allowed origin gets credentialed CORS, never a wildcard', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:5173');

    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
    assert.notEqual(res.headers['access-control-allow-origin'], '*');
  });

  test('a disallowed origin gets no allow-origin header', async () => {
    const res = await request(app).get('/').set('Origin', 'http://evil.example');
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });
});
