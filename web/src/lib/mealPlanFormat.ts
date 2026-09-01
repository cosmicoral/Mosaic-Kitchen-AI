import type { GeneratedMealPlan, MealSlot } from '../types';

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export const SLOT_TONES: Record<MealSlot, 'gold' | 'blue' | 'green'> = {
  breakfast: 'gold',
  lunch: 'blue',
  dinner: 'green',
};

// Built from date parts rather than parsing the string into an instant, for
// the same reason as the pantry helper: a plan starting on the 1st must not
// render as the 31st because of a timezone offset.
export function dayDate(startsOn: string, dayIndex: number): Date {
  const [year, month, day] = startsOn.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + dayIndex));
}

export function dayLabels(startsOn: string, dayIndex: number) {
  const date = dayDate(startsOn, dayIndex);
  return {
    // timeZone: 'UTC' matters — without it the formatter converts the UTC
    // midnight back into local time and can land on the previous day.
    short: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
    full: date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }),
  };
}

export function dayCost(plan: GeneratedMealPlan, dayIndex: number): number {
  const day = plan.days.find((entry) => entry.day_index === dayIndex);
  if (!day) return 0;
  return day.meals.reduce((total, meal) => total + meal.estimated_cost_gbp, 0);
}

// The share of ingredients already in the kitchen. This is the one "waste"
// number the data actually supports — the old 72% was invented.
export function pantryUsageRatio(plan: GeneratedMealPlan): number {
  let total = 0;
  let fromPantry = 0;

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        total += 1;
        if (ingredient.from_pantry) fromPantry += 1;
      }
    }
  }

  return total === 0 ? 0 : Math.round((fromPantry / total) * 100);
}

export function totalMeals(plan: GeneratedMealPlan): number {
  return plan.days.reduce((count, day) => count + day.meals.length, 0);
}

export function uniqueCuisines(plan: GeneratedMealPlan): string[] {
  const seen = new Set<string>();
  for (const day of plan.days) {
    for (const meal of day.meals) seen.add(meal.cuisine);
  }
  return [...seen];
}