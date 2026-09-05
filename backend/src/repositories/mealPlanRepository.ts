import pool from '../db/pool.ts';
import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';
import type { UserProfile } from '../types/index.ts';
import type { SupportedLocale } from '../utils/locale.ts';

export type MealPlanKind = 'weekly' | 'pantry';

export interface MealPlanRow {
  id: string;
  user_id: string;
  kind: MealPlanKind;
  starts_on: string;
  plan: GeneratedMealPlan;
  profile_snapshot: UserProfile;
  locale: SupportedLocale;
  created_at: Date;
}

const COLUMNS =
  'id, user_id, kind, starts_on, plan, profile_snapshot, locale, created_at';

export async function create(
  userId: string,
  startsOn: string,
  plan: GeneratedMealPlan,
  profileSnapshot: UserProfile,
  kind: MealPlanKind = 'weekly',
  // Recorded rather than inferred. Guessing the language from the text later
  // would be a second thing that can be wrong about a plan that already knows.
  locale: SupportedLocale = 'en'
): Promise<MealPlanRow> {
  const result = await pool.query<MealPlanRow>(
    `INSERT INTO meal_plans (user_id, starts_on, plan, profile_snapshot, kind, locale)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNS}`,
    // pg serialises objects to JSONB automatically; JSON.stringify here would
    // store a quoted string instead of a JSON document.
    [userId, startsOn, plan, profileSnapshot, kind, locale]
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
// Cached translations of a stored plan. Kept out of the plan row so the thing
// the model actually produced is never overwritten by a translation of itself.
export async function findTranslation(
  mealPlanId: string,
  locale: SupportedLocale
): Promise<GeneratedMealPlan | null> {
  const result = await pool.query<{ plan: GeneratedMealPlan }>(
    'SELECT plan FROM meal_plan_translations WHERE meal_plan_id = $1 AND locale = $2',
    [mealPlanId, locale]
  );
  return result.rows[0]?.plan ?? null;
}

export async function saveTranslation(
  mealPlanId: string,
  locale: SupportedLocale,
  plan: GeneratedMealPlan
): Promise<void> {
  // ON CONFLICT DO NOTHING, not DO UPDATE: two tabs opening the same plan at
  // once both translate, and the first one home is as good as the second.
  await pool.query(
    `INSERT INTO meal_plan_translations (meal_plan_id, locale, plan)
     VALUES ($1, $2, $3)
     ON CONFLICT (meal_plan_id, locale) DO NOTHING`,
    [mealPlanId, locale, plan]
  );
}

// Every plan the account owns, newest first. Only the data export needs this —
// the app itself never wants an unbounded list, which is why nothing else
// reads it.
export async function findAllForUser(userId: string): Promise<MealPlanRow[]> {
  const result = await pool.query<MealPlanRow>(
    `SELECT ${COLUMNS} FROM meal_plans WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}
