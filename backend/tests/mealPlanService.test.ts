import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import pool from '../src/db/pool.ts';
import * as mealPlanService from '../src/services/mealPlanService.ts';
import * as userRepository from '../src/repositories/userRepository.ts';
import { AppError } from '../src/types/index.ts';
import type { UserProfile } from '../src/types/index.ts';
import { closeDb, resetDb } from './helpers/db.ts';
import { makeMealPlan } from './helpers/mealPlan.ts';

const PROFILE: UserProfile = {
  user_id: '00000000-0000-0000-0000-000000000001',
  adults: 2,
  teenagers: 0,
  children: 0,
  toddlers: 0,
  household_size: 2,
  meals_per_week: 7,
  weekly_budget: '80.00',
  cuisines: ['chinese', 'british'],
  avoid_ingredients: ['peanut'],
  priorities: ['cultural-authenticity'],
  cooking_style: 'balanced',
  postcode: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await closeDb();
});

async function createUserWithProfile(
  cuisines: string[] = ['chinese', 'british'],
  mealsPerWeek = 7
) {
  const user = await userRepository.create(
    `meal-plan-${Date.now()}-${Math.random()}@example.com`,
    'not-used'
  );
  await pool.query(
    `INSERT INTO user_profiles (
       user_id, adults, meals_per_week, cuisines, avoid_ingredients,
       priorities, cooking_style
     ) VALUES ($1, 2, $2, $3, $4, $5, 'balanced')`,
    [
      user.id,
      mealsPerWeek,
      cuisines,
      ['peanut'],
      ['cultural-authenticity'],
    ]
  );
  return user;
}

function modelResult(plan: ReturnType<typeof makeMealPlan>) {
  return {
    plan,
    model: 'test-model',
    promptTokens: 100,
    completionTokens: 200,
    costUsd: 0.001,
  };
}

describe('mealPlanService profile requirements', () => {
  test('rejects an existing legacy profile with no cuisines before spending AI quota', async () => {
    const user = await userRepository.create('legacy-profile@example.com', 'not-used');
    await pool.query(
      `INSERT INTO user_profiles (user_id, adults, meals_per_week, cuisines)
       VALUES ($1, 1, 7, '{}')`,
      [user.id]
    );

    await assert.rejects(
      () => mealPlanService.generate(user.id),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'PROFILE_REQUIRED');
        assert.match(error.message, /at least one cuisine/i);
        return true;
      }
    );

    const usage = await pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM ai_usage WHERE user_id = $1',
      [user.id]
    );
    assert.equal(Number(usage.rows[0]?.count ?? 0), 0);
  });

  test('rejects a truncated model response instead of saving it as a successful plan', async () => {
    const user = await createUserWithProfile();
    const truncated = makeMealPlan(['chinese', 'british']);
    let calls = 0;

    await assert.rejects(
      () => mealPlanService.generate(user.id, async () => {
        calls += 1;
        return modelResult(truncated);
      }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'GENERATION_FAILED');
        return true;
      }
    );

    assert.equal(calls, 2);
    const plans = await pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM meal_plans WHERE user_id = $1',
      [user.id]
    );
    const usage = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM ai_usage
        WHERE user_id = $1 AND succeeded = false`,
      [user.id]
    );
    assert.equal(Number(plans.rows[0]?.count ?? 0), 0);
    assert.equal(Number(usage.rows[0]?.count ?? 0), 2);
  });

  test('accepts and saves a complete plan with the requested cuisine distribution', async () => {
    const user = await createUserWithProfile();
    const complete = makeMealPlan([
      'chinese',
      'british',
      'chinese',
      'british',
      'chinese',
      'british',
      'chinese',
    ]);

    const result = await mealPlanService.generate(
      user.id,
      async () => modelResult(complete)
    );

    assert.equal(result.attempts, 1);
    assert.equal(result.mealPlan.plan.days.flatMap((day) => day.meals).length, 7);
  });
});

describe('mealPlanService retry prompt', () => {
  test('includes meal count, dietary and cuisine corrections together', () => {
    const prompt = mealPlanService.buildRetryPrompt(
      PROFILE,
      [],
      [{ avoided: 'peanut', foundIn: 'peanut oil', meal: 'Noodles' }],
      [{ cuisine: 'british', expected: 3, actual: 1 }],
      { expected: 7, actual: 5 }
    );

    assert.match(prompt, /exactly 7 meals/);
    assert.match(prompt, /peanut oil/);
    assert.match(prompt, /british: 1 meal\(s\), needs at least 3/);
  });

  test('passes every first-attempt problem to the second model call', async () => {
    const user = await createUserWithProfile();
    const rejected = makeMealPlan([
      'chinese',
      'chinese',
      'chinese',
      'chinese',
      'british',
    ]);
    rejected.days[0]!.meals[0]!.ingredients[0]!.name = 'Peanut oil';

    const accepted = makeMealPlan([
      'chinese',
      'british',
      'chinese',
      'british',
      'chinese',
      'british',
      'chinese',
    ]);
    const prompts: string[] = [];

    const result = await mealPlanService.generate(
      user.id,
      async (_systemPrompt, userPrompt) => {
        prompts.push(userPrompt);
        return modelResult(prompts.length === 1 ? rejected : accepted);
      }
    );

    assert.equal(result.attempts, 2);
    assert.equal(prompts.length, 2);
    assert.match(prompts[1]!, /exactly 7 meals/);
    assert.match(prompts[1]!, /Peanut oil/);
    assert.match(prompts[1]!, /british: 1 meal\(s\), needs at least 3/);
  });
});
