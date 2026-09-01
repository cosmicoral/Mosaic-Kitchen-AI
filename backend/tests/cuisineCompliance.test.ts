import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  countMeals,
  findCuisineViolations,
  findMealCountViolation,
} from '../src/services/cuisineCompliance.ts';
import { makeMealPlan } from './helpers/mealPlan.ts';

describe('meal count compliance', () => {
  test('counts meals across all days', () => {
    assert.equal(countMeals(makeMealPlan(['chinese', 'british', 'chinese', 'british'])), 4);
  });

  test('accepts exactly the requested number of meals', () => {
    const plan = makeMealPlan(['chinese', 'british', 'chinese']);
    assert.equal(findMealCountViolation(plan, 3), null);
  });

  test('rejects a plan that returns fewer meals than requested', () => {
    const plan = makeMealPlan(['chinese', 'british']);
    assert.deepEqual(findMealCountViolation(plan, 7), { expected: 7, actual: 2 });
  });

  test('rejects a plan that returns more meals than requested', () => {
    const plan = makeMealPlan(['chinese', 'british', 'chinese']);
    assert.deepEqual(findMealCountViolation(plan, 2), { expected: 2, actual: 3 });
  });
});

describe('cuisine distribution compliance', () => {
  test('accepts an even distribution', () => {
    const plan = makeMealPlan(['chinese', 'british', 'chinese', 'british']);
    assert.deepEqual(findCuisineViolations(plan, ['chinese', 'british'], 4), []);
  });

  test('reports every under-represented cuisine', () => {
    const plan = makeMealPlan(['chinese', 'chinese', 'chinese', 'british']);
    assert.deepEqual(findCuisineViolations(plan, ['chinese', 'british'], 4), [
      { cuisine: 'british', expected: 2, actual: 1 },
    ]);
  });

  test('uses the requested meal count rather than a truncated model response', () => {
    const plan = makeMealPlan(['chinese', 'british']);
    assert.deepEqual(findCuisineViolations(plan, ['chinese', 'british'], 7), [
      { cuisine: 'chinese', expected: 3, actual: 1 },
      { cuisine: 'british', expected: 3, actual: 1 },
    ]);
  });

  test('does not require every cuisine when there are fewer meals than cuisines', () => {
    const plan = makeMealPlan(['chinese', 'british']);
    assert.deepEqual(
      findCuisineViolations(plan, ['chinese', 'british', 'indian'], 2),
      []
    );
  });
});
