import pool from '../db/pool.ts';
import type { AggregatedItem } from '../services/ingredientAggregation.ts';
import type { PantryCategory } from '../types/index.ts';

export interface ShoppingListItem {
  id: string;
  user_id: string;
  meal_plan_id: string | null;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: PantryCategory;
  is_checked: boolean;
  source: 'plan' | 'manual';
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = `id, user_id, meal_plan_id, name, quantity, unit, category,
                 is_checked, source, created_at, updated_at`;

export async function findAllByUser(userId: string): Promise<ShoppingListItem[]> {
  const result = await pool.query<ShoppingListItem>(
    `SELECT ${COLUMNS} FROM shopping_list_items
      WHERE user_id = $1
      ORDER BY is_checked ASC, category ASC, name ASC`,
    [userId]
  );
  return result.rows;
}

// Two statements that must both happen or neither: deleting the old plan items
// and inserting the new ones. Without a transaction, a failure between them
// leaves the user with an empty list and no way to know why.
export async function replacePlanItems(
  userId: string,
  mealPlanId: string,
  items: AggregatedItem[]
): Promise<ShoppingListItem[]> {
  // A pooled client, not the pool itself: a transaction has to run on one
  // connection, and pool.query() may hand each statement a different one.
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Only the generated items. Anything the user typed themselves survives a
    // regeneration — that is what the source column is for.
    await client.query(
      `DELETE FROM shopping_list_items WHERE user_id = $1 AND source = 'plan'`,
      [userId]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO shopping_list_items
           (user_id, meal_plan_id, name, quantity, unit, category, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'plan')`,
        [userId, mealPlanId, item.name, item.quantity, item.unit, item.category]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Returns the connection to the pool. Missing this leaks a connection on
    // every call, and the pool runs dry after a handful of requests.
    client.release();
  }

  return findAllByUser(userId);
}

export async function createManual(
  userId: string,
  name: string,
  quantity: number | null,
  unit: string | null,
  category: PantryCategory
): Promise<ShoppingListItem> {
  const result = await pool.query<ShoppingListItem>(
    `INSERT INTO shopping_list_items (user_id, name, quantity, unit, category, source)
     VALUES ($1, $2, $3, $4, $5, 'manual')
     RETURNING ${COLUMNS}`,
    [userId, name, quantity, unit, category]
  );
  const item = result.rows[0];
  if (!item) throw new Error('INSERT ... RETURNING returned no row');
  return item;
}

export async function update(
  id: string,
  userId: string,
  patch: { is_checked?: boolean; quantity?: number | null; name?: string }
): Promise<ShoppingListItem | null> {
  const result = await pool.query<ShoppingListItem>(
    `UPDATE shopping_list_items
        SET is_checked = COALESCE($3, is_checked),
            quantity   = COALESCE($4, quantity),
            name       = COALESCE($5, name),
            updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING ${COLUMNS}`,
    [id, userId, patch.is_checked ?? null, patch.quantity ?? null, patch.name ?? null]
  );
  return result.rows[0] ?? null;
}

export async function deleteByIdForUser(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM shopping_list_items WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rowCount === 1;
}

export async function deleteChecked(userId: string): Promise<number> {
  const result = await pool.query(
    'DELETE FROM shopping_list_items WHERE user_id = $1 AND is_checked = true',
    [userId]
  );
  return result.rowCount ?? 0;
}