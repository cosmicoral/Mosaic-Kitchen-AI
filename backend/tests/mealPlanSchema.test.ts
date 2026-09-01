import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildMealPlanSchema } from '../src/schemas/mealPlan.ts';
import { makeMealPlan } from './helpers/mealPlan.ts';

describe('buildMealPlanSchema', () => {
  test('accepts meals from the cuisines selected by the user', () => {
    const schema = buildMealPlanSchema(['chinese', 'british']);
    const plan = makeMealPlan(['chinese', 'british']);

    assert.deepEqual(schema.parse(plan), plan);
  });

  test('rejects a cuisine outside the selected list', () => {
    const schema = buildMealPlanSchema(['chinese']);
    const plan = makeMealPlan(['british']);

    assert.throws(() => schema.parse(plan));
  });

  test('rejects a blank native dish name', () => {
    const schema = buildMealPlanSchema(['chinese']);
    const plan = makeMealPlan(['chinese']);
    plan.days[0]!.meals[0]!.native_name = '   ';

    assert.throws(() => schema.parse(plan));
  });
});
