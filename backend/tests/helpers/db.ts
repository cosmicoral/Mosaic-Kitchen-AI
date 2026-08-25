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

export async function resetDb(): Promise<void> {
  // One statement so the foreign key between sessions and users never blocks
  // the truncate.
  await pool.query('TRUNCATE sessions, users RESTART IDENTITY CASCADE');
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
