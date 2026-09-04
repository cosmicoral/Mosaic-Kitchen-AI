import pool from '../db/pool.ts';
import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';
import type { UserProfile } from '../types/index.ts';

export type MealPlanKind = 'weekly' | 'pantry';

export interface MealPlanRow {
  id: string;
  user_id: string;
  kind: MealPlanKind;
  starts_on: string;
  plan: GeneratedMealPlan;
  profile_snapshot: UserProfile;
  created_at: Date;
}

const COLUMNS = 'id, user_id, kind, starts_on, plan, profile_snapshot, created_at';

export async function create(
  userId: string,
  startsOn: string,
  plan: GeneratedMealPlan,
  profileSnapshot: UserProfile,
  kind: MealPlanKind = 'weekly'
): Promise<MealPlanRow> {
  const result = await pool.query<MealPlanRow>(
    `INSERT INTO meal_plans (user_id, starts_on, plan, profile_snapshot, kind)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    // pg serialises objects to JSONB automatically; JSON.stringify here would
    // store a quoted string instead of a JSON document.
    [userId, startsOn, plan, profileSnapshot, kind]
  );

  const row = result.rows[0];
  if (!row) throw new Error('INSERT ... RETURNING returned no row');
  return row;
}

// Filtered by kind, or a two-dish "what can I make with this cabbage" answer
// would surface on the meal plan page as this week's plan.
export async function findLatestForUser(
  userId: string,
  kind: MealPlanKind = 'weekly'
): Promise<MealPlanRow | null> {
  const result = await pool.query<MealPlanRow>(
    `SELECT ${COLUMNS} FROM meal_plans
      WHERE user_id = $1 AND kind = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, kind]
  );
  return result.rows[0] ?? null;
}

// Flattens every dish this user has ever been given, most recently seen first.
// Fed back into the prompt as a do-not-repeat list, which is the difference
// between a planner and a lookup that returns the same famous dish every week.
// Reads native_name where present because that is the stable identity of a
// dish — the English description varies from plan to plan.
export async function findRecentDishNames(
  userId: string,
  limit: number
): Promise<string[]> {
  const result = await pool.query<{ dish: string }>(
    `SELECT dish FROM (
       SELECT coalesce(nullif(meal->>'native_name', ''), meal->>'name') AS dish,
              max(mp.created_at) AS last_seen
         FROM meal_plans mp,
              jsonb_array_elements(mp.plan->'days') AS day,
              jsonb_array_elements(day->'meals') AS meal
        WHERE mp.user_id = $1
        GROUP BY dish
     ) recent
      WHERE dish IS NOT NULL
      ORDER BY last_seen DESC
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows.map((row) => row.dish);
}

export async function findByIdForUser(id: string, userId: string): Promise<MealPlanRow | null> {
  const result = await pool.query<MealPlanRow>(
    `SELECT ${COLUMNS} FROM meal_plans WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
}