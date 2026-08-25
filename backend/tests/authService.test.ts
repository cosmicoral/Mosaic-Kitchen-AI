import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';

import * as authService from '../src/services/authService.ts';
import { AppError } from '../src/types/index.ts';
import { closeDb, countSessions, findUserRow, insertSession, resetDb } from './helpers/db.ts';

const EMAIL = 'service@example.com';
const PASSWORD = 'supersecret123';

async function expectAppError(
  run: () => Promise<unknown>,
  code: string
): Promise<AppError> {
  try {
    await run();
  } catch (error) {
    assert.ok(error instanceof AppError, `expected an AppError, got ${String(error)}`);
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(`expected the call to reject with ${code}`);
}

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await closeDb();
});

describe('authService.signup validation', () => {
  test('accepts a password of exactly the minimum length', async () => {
    const result = await authService.signup(EMAIL, '12345678');
    assert.equal(result.user.email, EMAIL);
  });

  test('rejects a password one character short', async () => {
    await expectAppError(() => authService.signup(EMAIL, '1234567'), 'VALIDATION_ERROR');
    assert.equal(await findUserRow(EMAIL), null);
  });

  // bcrypt ignores everything past 72 bytes, so accepting a longer password
  // would silently authenticate anyone who knew the first 72 characters.
  test('rejects a password beyond the maximum length', async () => {
    const error = await expectAppError(
      () => authService.signup(EMAIL, 'a'.repeat(201)),
      'VALIDATION_ERROR'
    );
    assert.match(error.message, /at most/);
  });

  test('rejects malformed email addresses', async () => {
    for (const bad of ['plain', 'no@tld', '@example.com', 'spaces in@example.com', '']) {
      await expectAppError(() => authService.signup(bad, PASSWORD), 'VALIDATION_ERROR');
    }
  });

  test('rejects an email beyond the RFC length limit', async () => {
    const tooLong = `${'a'.repeat(250)}@example.com`;
    await expectAppError(() => authService.signup(tooLong, PASSWORD), 'VALIDATION_ERROR');
  });

  test('reports a taken email with EMAIL_TAKEN, not VALIDATION_ERROR', async () => {
    await authService.signup(EMAIL, PASSWORD);
    await expectAppError(() => authService.signup(EMAIL, PASSWORD), 'EMAIL_TAKEN');
  });
});

describe('authService password hashing', () => {
  test('stores a bcrypt hash at cost 12 that verifies against the password', async () => {
    await authService.signup(EMAIL, PASSWORD);

    const row = await findUserRow(EMAIL);
    assert.ok(row);
    assert.match(row.password_hash, /^\$2b\$12\$/);
    assert.equal(await bcrypt.compare(PASSWORD, row.password_hash), true);
    assert.equal(await bcrypt.compare('wrong', row.password_hash), false);
  });

  test('salts each hash so identical passwords hash differently', async () => {
    await authService.signup('one@example.com', PASSWORD);
    await authService.signup('two@example.com', PASSWORD);

    const first = await findUserRow('one@example.com');
    const second = await findUserRow('two@example.com');

    assert.ok(first && second);
    assert.notEqual(first.password_hash, second.password_hash);
  });

  // Only the email is normalised. Trimming or lowercasing the password would
  // silently shrink the keyspace.
  test('does not trim or lowercase the password', async () => {
    const padded = '  MiXeD Case  ';
    await authService.signup(EMAIL, padded);

    const row = await findUserRow(EMAIL);
    assert.ok(row);
    assert.equal(await bcrypt.compare(padded, row.password_hash), true);
    assert.equal(await bcrypt.compare(padded.trim().toLowerCase(), row.password_hash), false);
  });
});

describe('authService.login', () => {
  beforeEach(async () => {
    await authService.signup(EMAIL, PASSWORD);
  });

  test('rejects a wrong password with INVALID_CREDENTIALS', async () => {
    await expectAppError(() => authService.login(EMAIL, 'wrong'), 'INVALID_CREDENTIALS');
  });

  test('uses the same error code and message for an unknown email', async () => {
    const unknown = await expectAppError(
      () => authService.login('nobody@example.com', PASSWORD),
      'INVALID_CREDENTIALS'
    );
    const wrongPassword = await expectAppError(
      () => authService.login(EMAIL, 'wrong'),
      'INVALID_CREDENTIALS'
    );

    assert.equal(unknown.message, wrongPassword.message);
  });

  // The timing defence: signing in as a non-existent user still runs a bcrypt
  // comparison against DUMMY_HASH. Cost 12 costs hundreds of milliseconds, so
  // an early return would come back almost instantly. The threshold is
  // deliberately far below a real bcrypt round to stay stable on slow CI.
  test('spends real time hashing even when the user does not exist', async () => {
    const started = performance.now();
    await expectAppError(
      () => authService.login('nobody@example.com', PASSWORD),
      'INVALID_CREDENTIALS'
    );
    const elapsed = performance.now() - started;

    assert.ok(elapsed > 50, `unknown-email login returned in ${elapsed.toFixed(1)}ms`);
  });

  test('does not create a session for a failed login', async () => {
    const row = await findUserRow(EMAIL);
    assert.ok(row);
    const before = await countSessions(row.id);

    await expectAppError(() => authService.login(EMAIL, 'wrong'), 'INVALID_CREDENTIALS');

    assert.equal(await countSessions(row.id), before);
  });

  test('never returns the password hash', async () => {
    const { user } = await authService.login(EMAIL, PASSWORD);
    assert.equal('password_hash' in user, false);
  });
});

describe('authService sessions', () => {
  test('issues a 64-character hex session id', async () => {
    const { session } = await authService.signup(EMAIL, PASSWORD);
    // 32 random bytes, hex-encoded — 256 bits of entropy.
    assert.match(session.id, /^[0-9a-f]{64}$/);
  });

  test('sets expiry to the configured TTL', async () => {
    const { session } = await authService.signup(EMAIL, PASSWORD);

    const expectedMs = authService.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const actualMs = session.expires_at.getTime() - Date.now();

    // A few seconds of slack for the round trip.
    assert.ok(Math.abs(actualMs - expectedMs) < 10_000);
  });

  test('accumulates one session per login', async () => {
    const { user } = await authService.signup(EMAIL, PASSWORD);
    await authService.login(EMAIL, PASSWORD);
    await authService.login(EMAIL, PASSWORD);

    // Signing in on three devices should keep three sessions alive.
    assert.equal(await countSessions(user.id), 3);
  });

  test('getSessionUser resolves an active session to its user', async () => {
    const { user, session } = await authService.signup(EMAIL, PASSWORD);

    const resolved = await authService.getSessionUser(session.id);

    assert.ok(resolved);
    assert.equal(resolved.id, user.id);
    assert.equal(resolved.email, EMAIL);
  });

  test('getSessionUser returns null for undefined, unknown and expired ids', async () => {
    const { user } = await authService.signup(EMAIL, PASSWORD);
    await insertSession('stale', user.id, new Date(Date.now() - 1000));

    assert.equal(await authService.getSessionUser(undefined), null);
    assert.equal(await authService.getSessionUser('unknown'), null);
    assert.equal(await authService.getSessionUser('stale'), null);
  });

  test('logout removes only the session it was given', async () => {
    const { user, session } = await authService.signup(EMAIL, PASSWORD);
    const other = await authService.login(EMAIL, PASSWORD);

    await authService.logout(session.id);

    assert.equal(await authService.getSessionUser(session.id), null);
    assert.ok(await authService.getSessionUser(other.session.id));
    assert.equal(await countSessions(user.id), 1);
  });

  test('logout tolerates being called without a session', async () => {
    await authService.logout(undefined);
  });
});
