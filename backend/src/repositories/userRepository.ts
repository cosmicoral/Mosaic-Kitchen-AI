import pool from '../db/pool.ts';
import type { User, UserWithPassword } from '../types/index.ts';

export async function findByEmail(email: string): Promise<UserWithPassword | null> {
  const result = await pool.query<UserWithPassword>(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
}

export async function create(email: string, passwordHash: string): Promise<User> {
  const result = await pool.query<User>(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, passwordHash]
  );
  const user = result.rows[0];
  if (!user) throw new Error('INSERT ... RETURNING returned no row');
  return user;
}