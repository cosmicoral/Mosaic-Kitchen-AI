import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  budgetTolerance,
  findArithmeticViolation,
  findBudgetViolation,
  sumMealCosts,
} from '../src/services/budgetCompliance.ts';
import { makeMealPlan } from './helpers/mealPlan.ts';
import type { GeneratedMealPlan } from '../src/schemas/mealPlan.ts';

// Builds a plan whose meals carry the given costs, then states a total. The
// stated total is separate on purpose: the whole point of the arithmetic check
// is that a model can report a headline figure its own rows do not support.
function planCosting(mealCosts: number[], statedTotal?: number): GeneratedMealPlan {
  const plan = makeMealPlan(mealCosts.map(() => 'chinese'));
  const meals = plan.days.flatMap((day) => day.meals);

  meals.forEach((meal, index) => {
    meal.estimated_cost_gbp = mealCosts[index] ?? 0;
  });

  plan.estimated_total_gbp =
    statedTotal ?? Math.round(mealCosts.reduce((a, b) => a + b, 0) * 100) / 100;

  return plan;
}

describe('sumMealCosts', () => {
  test('adds every meal across every day', () => {
    assert.equal(sumMealCosts(planCosting([5.2, 3.5, 6.8])), 15.5);
  });

  test('rounds to pennies rather than leaving float dust', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in binary floating point, and a total
    // rendered as £15.500000000000002 is the kind of detail that makes an app
    // look broken.
    assert.equal(sumMealCosts(planCosting([0.1, 0.2])), 0.3);
  });
});

describe('findArithmeticViolation', () => {
  test('accepts a total that matches its meals', () => {
    assert.equal(findArithmeticViolation(planCosting([5.2, 3.5, 6.8])), null);
  });

  test('tolerates rounding of a few pence', () => {
    assert.equal(findArithmeticViolation(planCosting([5.2, 3.5, 6.8], 15.7)), null);
  });

  test('rejects a total that disagrees with its own rows', () => {
    const violation = findArithmeticViolation(planCosting([5.2, 3.5, 6.8], 42));
    assert.deepEqual(violation, { stated: 42, summed: 15.5 });
  });
});

describe('budgetTolerance', () => {
  test('never drops below ten pounds', () => {
    assert.equal(budgetTolerance(30), 10);
  });

  test('widens with a larger budget', () => {
    // A flat £10 band is a third of a £30 budget and under a tenth of a £120
    // one; the same number cannot mean the same thing at both ends.
    assert.equal(budgetTolerance(120), 18);
  });
});

describe('findBudgetViolation', () => {
  test('does nothing when no budget was set', () => {
    assert.equal(findBudgetViolation(planCosting([50]), null), null);
  });

  test('accepts a plan inside the band', () => {
    assert.equal(findBudgetViolation(planCosting([40, 35]), 80), null);
  });

  test('accepts a plan exactly on the edge of the band', () => {
    assert.equal(findBudgetViolation(planCosting([92]), 80), null);
  });

  test('rejects a plan over the band', () => {
    const violation = findBudgetViolation(planCosting([100, 60]), 80);
    assert.deepEqual(violation, {
      budget: 80,
      actual: 160,
      tolerance: 12,
      direction: 'over',
    });
  });

  test('rejects a plan far under the band', () => {
    // Not a harm, but the household said what it was willing to spend, and a
    // plan at a third of that is usually a thin one rather than a bargain.
    const violation = findBudgetViolation(planCosting([25]), 80);
    assert.equal(violation?.direction, 'under');
    assert.equal(violation?.actual, 25);
  });

  test('ignores a zero or negative budget rather than dividing by it', () => {
    assert.equal(findBudgetViolation(planCosting([50]), 0), null);
    assert.equal(findBudgetViolation(planCosting([50]), -10), null);
  });
});
