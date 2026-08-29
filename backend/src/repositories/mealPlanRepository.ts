import pool from '../db/pool.ts';
import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';
import type { UserProfile } from '../types/index.ts';

export interface MealPlanRow {
  id: string;
  user_id: string;
  starts_on: string;
  plan: GeneratedMealPlan;
  profile_snapshot: UserProfile;
  created_at: Date;
}

const COLUMNS = 'id, user_id, starts_on, plan, profile_snapshot, created_at';

export async function create(
  userId: string,
  startsOn: string,
  plan: GeneratedMealPlan,
  profileSnapshot: UserProfile
): Promise<MealPlanRow> {
  const result = await pool.query<MealPlanRow>(
    `INSERT INTO meal_plans (user_id, starts_on, plan, profile_snapshot)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    // pg serialises objects to JSONB automatically; JSON.stringify here would
    // store a quoted string instead of a JSON document.
    [userId, startsOn, plan, profileSnapshot]
  );

  const row = result.rows[0];
  if (!row) throw new Error('INSERT ... RETURNING returned no row');
  return row;
}

export async function findLatestForUser(userId: string): Promise<MealPlanRow | null> {
  const result = await pool.query<MealPlanRow>(
    `SELECT ${COLUMNS} FROM meal_plans
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function findByIdForUser(id: string, userId: string): Promise<MealPlanRow | null> {
  const result = await pool.query<MealPlanRow>(
    `SELECT ${COLUMNS} FROM meal_plans WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
}