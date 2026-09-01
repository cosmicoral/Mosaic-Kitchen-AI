import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';

export interface CuisineViolation {
  cuisine: string;
  expected: number;
  actual: number;
}

export interface MealCountViolation {
  expected: number;
  actual: number;
}

export function countMeals(plan: GeneratedMealPlan): number {
  return plan.days.reduce((total, day) => total + day.meals.length, 0);
}

export function findMealCountViolation(
  plan: GeneratedMealPlan,
  expectedMeals: number
): MealCountViolation | null {
  const actual = countMeals(plan);
  return actual === expectedMeals ? null : { expected: expectedMeals, actual };
}

// The schema already makes an out-of-list cuisine impossible, so what is left
// to check is distribution: nothing in a JSON schema can say "each of these
// three values must appear at least twice".
export function findCuisineViolations(
  plan: GeneratedMealPlan,
  cuisines: readonly string[],
  expectedMeals: number
): CuisineViolation[] {
  if (cuisines.length === 0) return [];

  const meals = plan.days.flatMap((day) => day.meals);
  const expected = Math.floor(expectedMeals / cuisines.length);
  if (expected < 1) return [];

  const counts = new Map<string, number>();
  for (const meal of meals) {
    counts.set(meal.cuisine, (counts.get(meal.cuisine) ?? 0) + 1);
  }

  return cuisines
    .map((cuisine) => ({
      cuisine,
      expected,
      actual: counts.get(cuisine) ?? 0,
    }))
    .filter((entry) => entry.actual < entry.expected);
}
