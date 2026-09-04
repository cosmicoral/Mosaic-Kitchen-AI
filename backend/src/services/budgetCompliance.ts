import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';

// Absolute floor for the tolerance band. A fixed ±£10 is a third of a £30
// budget and under a tenth of a £120 one, so the band widens with the budget
// and never drops below a tenner.
const MIN_TOLERANCE_GBP = 10;
const TOLERANCE_FRACTION = 0.15;

// A model can be out by a few pence rounding each meal; that is not a fault
// worth spending a second generation on.
const ARITHMETIC_SLACK_GBP = 0.5;

export function budgetTolerance(budget: number): number {
  return Math.max(MIN_TOLERANCE_GBP, budget * TOLERANCE_FRACTION);
}

// Counts extras as well as meals. Fruit and puddings are things the household
// will actually buy, so leaving them out of the total would understate the
// shop by exactly the amount the app added to it.
export function sumMealCosts(plan: GeneratedMealPlan): number {
  const total = plan.days.reduce((running, day) => {
    const meals = day.meals.reduce((sum, meal) => sum + meal.estimated_cost_gbp, 0);
    const extras = (day.extras ?? []).reduce(
      (sum, extra) => sum + extra.estimated_cost_gbp,
      0
    );
    return running + meals + extras;
  }, 0);

  return Math.round(total * 100) / 100;
}

export interface ArithmeticViolation {
  stated: number;
  summed: number;
}

// A real deterministic check, unlike the budget band below: whatever the
// prices are worth, the total the plan reports must equal the sum of the meals
// it contains. Models add up badly, and a headline figure that disagrees with
// its own rows is the kind of error a user spots immediately and never trusts
// the app again after.
export function findArithmeticViolation(
  plan: GeneratedMealPlan
): ArithmeticViolation | null {
  const summed = sumMealCosts(plan);
  const stated = plan.estimated_total_gbp;

  if (Math.abs(summed - stated) <= ARITHMETIC_SLACK_GBP) return null;
  return { stated, summed };
}

export interface BudgetViolation {
  budget: number;
  actual: number;
  tolerance: number;
  direction: 'over' | 'under';
}

// Checks the plan against the budget the household set. Note what this does
// and does not promise: estimated_cost_gbp is the model's own guess at UK
// supermarket prices, not a real quote, so this cannot guarantee the shop will
// cost that. What it does catch is a plan that is not even trying — one the
// model itself prices at double the budget — which is a different and very
// common failure.
export function findBudgetViolation(
  plan: GeneratedMealPlan,
  weeklyBudget: number | null
): BudgetViolation | null {
  if (weeklyBudget === null || weeklyBudget <= 0) return null;

  const actual = sumMealCosts(plan);
  const tolerance = budgetTolerance(weeklyBudget);

  if (actual > weeklyBudget + tolerance) {
    return { budget: weeklyBudget, actual, tolerance, direction: 'over' };
  }

  // Coming in under budget is not a failure in the way going over is — nobody
  // is harmed by spending less. It is flagged anyway because a plan at half
  // the budget is usually a thin plan, and the household said what they were
  // willing to spend.
  if (actual < weeklyBudget - tolerance) {
    return { budget: weeklyBudget, actual, tolerance, direction: 'under' };
  }

  return null;
}
