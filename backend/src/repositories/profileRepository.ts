import pool from '../db/pool.ts';
import type { UserProfile, UserProfileInput } from '../types/index.ts';

const COLUMNS = `user_id, adults, teenagers, children, toddlers, household_size,
                 meals_per_week, weekly_budget, cuisines, avoid_ingredients,
                 priorities, cooking_style, postcode, created_at, updated_at`;

export async function findByUserId(userId: string): Promise<UserProfile | null> {
  const result = await pool.query<UserProfile>(
    `SELECT ${COLUMNS} FROM user_profiles WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

// Onboarding and the profile screen both send a complete profile, and a user
// may or may not already have one. An upsert covers both in a single
// statement, which also means no read-then-write race between two tabs.
export async function upsert(
  userId: string,
  input: UserProfileInput
): Promise<UserProfile> {
  const result = await pool.query<UserProfile>(
    `INSERT INTO user_profiles (
       user_id, adults, teenagers, children, toddlers,
       meals_per_week, weekly_budget, cuisines, avoid_ingredients,
       priorities, cooking_style, postcode
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (user_id) DO UPDATE SET
       adults            = EXCLUDED.adults,
       teenagers         = EXCLUDED.teenagers,
       children          = EXCLUDED.children,
       toddlers          = EXCLUDED.toddlers,
       meals_per_week    = EXCLUDED.meals_per_week,
       weekly_budget     = EXCLUDED.weekly_budget,
       cuisines          = EXCLUDED.cuisines,
       avoid_ingredients = EXCLUDED.avoid_ingredients,
       priorities        = EXCLUDED.priorities,
       cooking_style     = EXCLUDED.cooking_style,
       postcode          = EXCLUDED.postcode,
       updated_at        = now()
     RETURNING ${COLUMNS}`,
    [
      userId,
      input.adults,
      input.teenagers,
      input.children,
      input.toddlers,
      input.meals_per_week,
      input.weekly_budget,
      input.cuisines,
      input.avoid_ingredients,
      input.priorities,
      input.cooking_style,
      input.postcode,
    ]
  );

  const profile = result.rows[0];
  if (!profile) throw new Error('INSERT ... RETURNING returned no row');
  return profile;
}