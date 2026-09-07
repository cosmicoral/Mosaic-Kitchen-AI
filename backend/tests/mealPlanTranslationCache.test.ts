import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

import * as mealPlanRepository from '../src/repositories/mealPlanRepository.ts';
import * as userRepository from '../src/repositories/userRepository.ts';
import pool from '../src/db/pool.ts';
import { closeDb, resetDb } from './helpers/db.ts';
import { makeMealPlan } from './helpers/mealPlan.ts';
import type { UserProfile } from '../src/types/index.ts';

beforeEach(resetDb);
after(closeDb);

test('a repaired translation replaces a stale mixed-language cache row', async () => {
  const user = await userRepository.create(
    `translation-cache-${Date.now()}@example.com`,
    'not-used'
  );
  const profile = {
    user_id: user.id,
    adults: 1,
    household_size: 1,
    meals_per_week: 1,
    weekly_budget: null,
    cuisines: ['korean'],
    cuisine_substyles: [],
    seasoning_intensity: null,
    flavour_notes: [],
    low_salt: false,
    low_sugar: false,
    nutrition_focus: [],
    include_extras: [],
    extras_frequency: 'some',
    avoid_ingredients: [],
    priorities: [],
    cooking_style: null,
    postcode: null,
  } as unknown as UserProfile;

  const source = makeMealPlan(['korean']);
  const row = await mealPlanRepository.create(
    user.id,
    '2026-09-07',
    source,
    profile,
    'weekly',
    'zh'
  );

  const stale = structuredClone(source);
  stale.days[0]!.meals[0]!.region = '全罗道';
  const repaired = structuredClone(source);
  repaired.days[0]!.meals[0]!.region = 'Jeolla';

  await mealPlanRepository.saveTranslation(row.id, 'en', 'card', stale);
  await mealPlanRepository.saveTranslation(row.id, 'en', 'card', repaired);

  const cached = await mealPlanRepository.findTranslation(row.id, 'en', 'card');
  assert.equal(cached?.days[0]?.meals[0]?.region, 'Jeolla');

  const count = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM meal_plan_translations
      WHERE meal_plan_id = $1 AND locale = 'en' AND scope = 'card'`,
    [row.id]
  );
  assert.equal(Number(count.rows[0]?.count ?? 0), 1);
});
