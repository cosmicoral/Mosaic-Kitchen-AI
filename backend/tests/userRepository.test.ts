import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import * as userRepository from '../src/repositories/userRepository.ts';
import { closeDb, resetDb } from './helpers/db.ts';

const EMAIL = 'repo@example.com';
const HASH = '$2b$12$abcdefghijklmnopqrstuv0123456789012345678901234567890';

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await closeDb();
});

describe('userRepository.create', () => {
  test('returns the row the database generated', async () => {
    const user = await userRepository.create(EMAIL, HASH);

    assert.equal(user.email, EMAIL);
    // gen_random_uuid() supplies the id; the app never sends one.
    assert.match(user.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // DEFAULT now() supplies created_at, and pg parses timestamptz to a Date.
    assert.ok(user.created_at instanceof Date);
  });

  test('omits password_hash from the returned row', async () => {
    const user = await userRepository.create(EMAIL, HASH);
    assert.equal('password_hash' in user, false);
  });

  test('gives every user a distinct id', async () => {
    const first = await userRepository.create('a@example.com', HASH);
    const second = await userRepository.create('b@example.com', HASH);
    assert.notEqual(first.id, second.id);
  });

  // The service checks for an existing email first, but this proves the
  // database is the real guarantee — two concurrent signups cannot both win.
  test('rejects a duplicate email through the UNIQUE constraint', async () => {
    await userRepository.create(EMAIL, HASH);

    await assert.rejects(
      () => userRepository.create(EMAIL, HASH),
      (error: unknown) => {
        // 23505 is Postgres's unique_violation.
        assert.equal((error as { code?: string }).code, '23505');
        return true;
      }
    );
  });

  // The UNIQUE constraint is byte-comparison only. Case-insensitivity comes
  // from normalising in authService, not from the database — this test exists
  // so that assumption is written down and cannot silently change.
  test('treats differently-cased emails as distinct at the database level', async () => {
    await userRepository.create('case@example.com', HASH);
    const upper = await userRepository.create('CASE@EXAMPLE.COM', HASH);

    assert.equal(upper.email, 'CASE@EXAMPLE.COM');
  });
});

describe('userRepository.findByEmail', () => {
  test('returns the row including the password hash', async () => {
    const created = await userRepository.create(EMAIL, HASH);
    const found = await userRepository.findByEmail(EMAIL);

    assert.ok(found);
    assert.equal(found.id, created.id);
    assert.equal(found.password_hash, HASH);
  });

  test('returns null when no user matches', async () => {
    assert.equal(await userRepository.findByEmail('missing@example.com'), null);
  });

  // A repository that leaks SQL syntax would either throw or return a row.
  test('treats injection-ish input as a plain value', async () => {
    await userRepository.create(EMAIL, HASH);

    const found = await userRepository.findByEmail("' OR '1'='1");

    assert.equal(found, null);
  });
});
