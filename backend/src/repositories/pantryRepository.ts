import pool from '../db/pool.ts';
import type { PantryItem, PantryItemInput, PantryItemPatch } from '../types/index.ts';

const COLUMNS = `id, user_id, name, category, quantity, unit, expires_on, created_at, updated_at`;

// Every query filters on user_id as well as id. Looking a row up by id alone
// and checking ownership afterwards leaks existence: a 404 and a 403 tell an
// attacker different things about rows they do not own.
export async function findAllByUser(userId: string): Promise<PantryItem[]> {
  const result = await pool.query<PantryItem>(
    `SELECT ${COLUMNS}
       FROM pantry_items
      WHERE user_id = $1
      ORDER BY expires_on ASC NULLS LAST, name ASC`,
    [userId]
  );
  return result.rows;
}

export async function findByIdForUser(
  id: string,
  userId: string
): Promise<PantryItem | null> {
  const result = await pool.query<PantryItem>(
    `SELECT ${COLUMNS} FROM pantry_items WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
}

export async function findExpiringForUser(
  userId: string,
  withinDays: number
): Promise<PantryItem[]> {
  const result = await pool.query<PantryItem>(
    `SELECT ${COLUMNS}
       FROM pantry_items
      WHERE user_id = $1
        AND expires_on IS NOT NULL
        AND expires_on <= CURRENT_DATE + $2::int
      ORDER BY expires_on ASC`,
    [userId, withinDays]
  );
  return result.rows;
}

export async function create(
  userId: string,
  input: PantryItemInput
): Promise<PantryItem> {
  const result = await pool.query<PantryItem>(
    `INSERT INTO pantry_items (user_id, name, category, quantity, unit, expires_on)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    [userId, input.name, input.category, input.quantity, input.unit, input.expires_on]
  );
  const item = result.rows[0];
  if (!item) throw new Error('INSERT ... RETURNING returned no row');
  return item;
}

// COALESCE keeps this a single statement for a partial update: each column
// takes the new value when one was supplied, and its current value when the
// parameter is null. The alternative — building the SET clause dynamically —
// means assembling SQL from a request body, which is exactly the habit that
// leads to injection bugs.
export async function update(
  id: string,
  userId: string,
  patch: PantryItemPatch
): Promise<PantryItem | null> {
  const result = await pool.query<PantryItem>(
    `UPDATE pantry_items
        SET name       = COALESCE($3, name),
            category   = COALESCE($4, category),
            quantity   = COALESCE($5, quantity),
            unit       = COALESCE($6, unit),
            expires_on = COALESCE($7, expires_on),
            updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING ${COLUMNS}`,
    [
      id,
      userId,
      patch.name ?? null,
      patch.category ?? null,
      patch.quantity ?? null,
      patch.unit ?? null,
      patch.expires_on ?? null,
    ]
  );
  return result.rows[0] ?? null;
}

// Returns whether a row was actually removed, so the controller can answer
// 404 rather than pretending a delete succeeded.
export async function deleteByIdForUser(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM pantry_items WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rowCount === 1;
}