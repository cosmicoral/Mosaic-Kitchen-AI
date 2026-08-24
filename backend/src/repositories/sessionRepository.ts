import pool from '../db/pool.ts';
import type { Session, SessionWithUser } from '../types/index.ts';

export async function create(
  id: string,
  userId: string,
  expiresAt: Date
): Promise<Session> {
  const result = await pool.query<Session>(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, expires_at',
    [id, userId, expiresAt]
  );
  const session = result.rows[0];
  if (!session) throw new Error('INSERT ... RETURNING returned no row');
  return session;
}

// Expiry is filtered in SQL so callers can never accidentally use a stale
// session, and so the database clock is the single source of truth.
// Joins to users so the auth middleware needs only one round trip.
export async function findActiveWithUser(id: string): Promise<SessionWithUser | null> {
  const result = await pool.query<SessionWithUser>(
    `SELECT s.id            AS session_id,
            s.expires_at    AS expires_at,
            u.id            AS user_id,
            u.email         AS email,
            u.created_at    AS user_created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
        AND s.expires_at > now()`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function deleteById(id: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
}

export async function deleteExpired(): Promise<number> {
  const result = await pool.query('DELETE FROM sessions WHERE expires_at <= now()');
  return result.rowCount ?? 0;
}