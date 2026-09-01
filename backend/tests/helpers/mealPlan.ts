import type { GeneratedMealPlan } from '../../src/schemas/mealPlan.ts';

const SLOTS = ['breakfast', 'lunch', 'dinner'] as const;

export function makeMealPlan(cuisines: string[]): GeneratedMealPlan {
  const days: GeneratedMealPlan['days'] = [];

  cuisines.forEach((cuisine, index) => {
    const dayIndex = Math.floor(index / 3);
    const day = days[dayIndex] ?? { day_index: dayIndex, meals: [] };
    day.meals.push({
      slot: SLOTS[index % SLOTS.length]!,
      name: `${cuisine} meal ${index + 1}`,
      native_name: `${cuisine} native ${index + 1}`,
      cuisine,
      minutes: 30,
      servings: 2,
      estimated_cost_gbp: 5,
      ingredients: [
        {
          name: 'Rice',
          quantity: 200,
          unit: 'g',
          from_pantry: false,
        },
      ],
      steps: ['Cook the meal.'],
    });
    days[dayIndex] = day;
  });

  return {
    summary: 'A test meal plan',
    days,
    estimated_total_gbp: cuisines.length * 5,
    waste_reduction_tip: 'Use leftovers tomorrow.',
  };
}
