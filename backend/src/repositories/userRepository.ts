import pool from '../db/pool.ts';
import type { User, UserWithPassword } from '../types/index.ts';

export async function findByEmail(email: string): Promise<UserWithPassword | null> {
  const result = await pool.query<UserWithPassword>(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
}

export async function create(
  email: string,
  passwordHash: string | null
): Promise<User> {
  const result = await pool.query<User>(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, passwordHash]
  );
  const user = result.rows[0];
  if (!user) throw new Error('INSERT ... RETURNING returned no row');
  return user;
}

export async function findById(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT id, email, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findByStripeCustomerId(customerId: string): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT id, email, created_at FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );
  return result.rows[0] ?? null;
}

export async function findStripeCustomerId(userId: string): Promise<string | null> {
  const result = await pool.query<{ stripe_customer_id: string | null }>(
    'SELECT stripe_customer_id FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.stripe_customer_id ?? null;
}

export async function setStripeCustomerId(
  userId: string,
  customerId: string
): Promise<void> {
  await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [
    customerId,
    userId,
  ]);
}