import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import * as sessionRepository from '../src/repositories/sessionRepository.ts';
import * as userRepository from '../src/repositories/userRepository.ts';
import {
  closeDb,
  countAllSessions,
  deleteUserRow,
  insertSession,
  resetDb,
  sessionExists,
} from './helpers/db.ts';

const HASH = '$2b$12$abcdefghijklmnopqrstuv0123456789012345678901234567890';

function future(ms = 60_000): Date {
  return new Date(Date.now() + ms);
}

function past(ms = 60_000): Date {
  return new Date(Date.now() - ms);
}

async function makeUser(email = 'session@example.com') {
  return userRepository.create(email, HASH);
}

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await closeDb();
});

describe('sessionRepository.create', () => {
  test('stores the id supplied by the application', async () => {
    const user = await makeUser();
    const session = await sessionRepository.create('app-generated-id', user.id, future());

    assert.equal(session.id, 'app-generated-id');
    assert.equal(session.user_id, user.id);
    assert.ok(session.expires_at instanceof Date);
  });

  // Proves the REFERENCES constraint is doing its job: a session can never
  // point at a user that does not exist.
  test('rejects a session for a non-existent user', async () => {
    await assert.rejects(
      () =>
        sessionRepository.create(
          'orphan',
          '00000000-0000-0000-0000-000000000000',
          future()
        ),
      (error: unknown) => {
        // 23503 is Postgres's foreign_key_violation.
        assert.equal((error as { code?: string }).code, '23503');
        return true;
      }
    );
  });

  test('rejects a duplicate session id', async () => {
    const user = await makeUser();
    await sessionRepository.create('duplicate', user.id, future());

    await assert.rejects(
      () => sessionRepository.create('duplicate', user.id, future()),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, '23505');
        return true;
      }
    );
  });
});

describe('sessionRepository.findActiveWithUser', () => {
  test('returns the joined session and user for an active session', async () => {
    const user = await makeUser();
    await sessionRepository.create('active', user.id, future());

    const row = await sessionRepository.findActiveWithUser('active');

    assert.ok(row);
    assert.equal(row.session_id, 'active');
    assert.equal(row.user_id, user.id);
    assert.equal(row.email, 'session@example.com');
    assert.ok(row.user_created_at instanceof Date);
  });

  // This is the whole point of filtering on expires_at in SQL rather than in
  // JavaScript: the row is present but must never authenticate.
  test('returns null for an expired session even though the row exists', async () => {
    const user = await makeUser();
    await insertSession('expired', user.id, past());

    assert.equal(await sessionExists('expired'), true);
    assert.equal(await sessionRepository.findActiveWithUser('expired'), null);
  });

  test('returns null for an unknown session id', async () => {
    assert.equal(await sessionRepository.findActiveWithUser('nope'), null);
  });
});

describe('sessionRepository.deleteById', () => {
  test('removes the session', async () => {
    const user = await makeUser();
    await sessionRepository.create('to-delete', user.id, future());

    await sessionRepository.deleteById('to-delete');

    assert.equal(await sessionExists('to-delete'), false);
  });

  test('is a no-op for an id that does not exist', async () => {
    await sessionRepository.deleteById('never-existed');
    assert.equal(await countAllSessions(), 0);
  });

  test('leaves other sessions alone', async () => {
    const user = await makeUser();
    await sessionRepository.create('keep', user.id, future());
    await sessionRepository.create('drop', user.id, future());

    await sessionRepository.deleteById('drop');

    assert.equal(await sessionExists('keep'), true);
    assert.equal(await countAllSessions(), 1);
  });
});

describe('sessionRepository.deleteExpired', () => {
  test('deletes only expired rows and reports how many', async () => {
    const user = await makeUser();
    await insertSession('old-1', user.id, past());
    await insertSession('old-2', user.id, past(5000));
    await sessionRepository.create('fresh', user.id, future());

    const deleted = await sessionRepository.deleteExpired();

    assert.equal(deleted, 2);
    assert.equal(await sessionExists('fresh'), true);
    assert.equal(await countAllSessions(), 1);
  });

  test('returns 0 when nothing has expired', async () => {
    const user = await makeUser();
    await sessionRepository.create('fresh', user.id, future());

    assert.equal(await sessionRepository.deleteExpired(), 0);
  });
});

describe('ON DELETE CASCADE', () => {
  test('deleting a user removes their sessions', async () => {
    const user = await makeUser();
    await sessionRepository.create('cascade-1', user.id, future());
    await sessionRepository.create('cascade-2', user.id, future());

    await deleteUserRow(user.id);

    assert.equal(await countAllSessions(), 0);
  });

  test('deleting one user leaves another user sessions intact', async () => {
    const alice = await makeUser('alice@example.com');
    const bob = await makeUser('bob@example.com');
    await sessionRepository.create('alice-session', alice.id, future());
    await sessionRepository.create('bob-session', bob.id, future());

    await deleteUserRow(alice.id);

    assert.equal(await sessionExists('bob-session'), true);
    assert.equal(await countAllSessions(), 1);
  });
});
