import pool from '../../src/db/pool.ts';

// These tests hit a real database so they exercise the SQL, the constraints
// and the JOIN — the parts most likely to break. They TRUNCATE between tests,
// which would be catastrophic against the development or production branch,
// hence the guard below.
if (process.env.NODE_ENV !== 'test') {
  throw new Error(
    'Refusing to run: tests TRUNCATE tables and NODE_ENV is not "test". ' +
      'Run them with `npm test`, which loads .env.test.'
  );
}

// NOTE: every test file clears the same database, so the files must not run in
// parallel — two suites interleaving would let one wipe rows another is
// mid-way through using. `npm test` passes --test-concurrency=1 for exactly
// this reason. If the suite ever grows too slow, the fix is a schema (or Neon
// branch) per file, not re-enabling parallelism.
//
// DELETE rather than TRUNCATE: TRUNCATE needs an ACCESS EXCLUSIVE lock and
// waits forever if any other connection still holds a lock on the table, which
// hangs the run with no error. DELETE takes a weaker lock, and these tables
// never hold more than a handful of rows.
export async function resetDb(): Promise<void> {
  // One call so all statements run on the same pooled connection — separate
  // pool.query() calls can each be handed a different one, which would leave
  // the lock_timeout applied to the wrong session.
  //
  // Children before parents. ON DELETE CASCADE would handle this, but naming
  // each table means a new one cannot be silently forgotten here.
  await pool.query(
    `SET lock_timeout = '5s';
     DELETE FROM pantry_items;
     DELETE FROM sessions;
     DELETE FROM users;`
  );
}

export async function closeDb(): Promise<void> {
  await pool.end();
}

// Inserts a session row directly, bypassing the service layer, so tests can
// construct states the API cannot — an already-expired session, for example.
export async function insertSession(
  id: string,
  userId: string,
  expiresAt: Date
): Promise<void> {
  await pool.query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [id, userId, expiresAt]
  );
}

export async function countSessions(userId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM sessions WHERE user_id = $1',
    [userId]
  );
  // COUNT() comes back as a string because bigint does not fit in a JS number.
  return Number(result.rows[0]?.count ?? 0);
}

export async function findUserRow(
  email: string
): Promise<{ id: string; email: string; password_hash: string } | null> {
  const result = await pool.query<{ id: string; email: string; password_hash: string }>(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
}

export async function countAllSessions(): Promise<number> {
  const result = await pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM sessions');
  return Number(result.rows[0]?.count ?? 0);
}

export async function sessionExists(id: string): Promise<boolean> {
  const result = await pool.query('SELECT 1 FROM sessions WHERE id = $1', [id]);
  return result.rowCount === 1;
}

// Deletes straight through the database so the ON DELETE CASCADE on
// sessions.user_id can be observed.
export async function deleteUserRow(userId: string): Promise<void> {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}
