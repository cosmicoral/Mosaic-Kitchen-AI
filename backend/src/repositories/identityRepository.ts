import pool from '../db/pool.ts';
import type { OAuthProvider, User, UserIdentity } from '../types/index.ts';

const COLUMNS = `id, user_id, provider, provider_user_id, email,
                 created_at, last_login_at`;

// Looked up by subject, never by email. Apple stops returning the email after
// the first authorisation and a Google user can change theirs, so email is not
// a stable identifier — treating it as one is how accounts get mixed up.
export async function findByProviderUserId(
  provider: OAuthProvider,
  providerUserId: string
): Promise<UserIdentity | null> {
  const result = await pool.query<UserIdentity>(
    `SELECT ${COLUMNS} FROM user_identities
      WHERE provider = $1 AND provider_user_id = $2`,
    [provider, providerUserId]
  );
  return result.rows[0] ?? null;
}

export async function link(input: {
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
}): Promise<UserIdentity> {
  const result = await pool.query<UserIdentity>(
    `INSERT INTO user_identities (user_id, provider, provider_user_id, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (provider, provider_user_id) DO UPDATE SET
       email         = EXCLUDED.email,
       last_login_at = now()
     RETURNING ${COLUMNS}`,
    [input.userId, input.provider, input.providerUserId, input.email]
  );

  const row = result.rows[0];
  if (!row) throw new Error('INSERT ... RETURNING returned no row');
  return row;
}

export async function touchLastLogin(id: string): Promise<void> {
  await pool.query('UPDATE user_identities SET last_login_at = now() WHERE id = $1', [id]);
}

export async function findUserByIdentity(
  provider: OAuthProvider,
  providerUserId: string
): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT u.id, u.email, u.created_at
       FROM user_identities i
       JOIN users u ON u.id = i.user_id
      WHERE i.provider = $1 AND i.provider_user_id = $2`,
    [provider, providerUserId]
  );
  return result.rows[0] ?? null;
}

export async function listForUser(userId: string): Promise<UserIdentity[]> {
  const result = await pool.query<UserIdentity>(
    `SELECT ${COLUMNS} FROM user_identities WHERE user_id = $1 ORDER BY created_at`,
    [userId]
  );
  return result.rows;
}
