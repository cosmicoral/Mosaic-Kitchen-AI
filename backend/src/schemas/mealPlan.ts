import { z } from 'zod';

// This schema does double duty: OpenAI enforces it on the model's output, and
// zod re-validates the parsed result. Belt and braces — structured outputs are
// reliable, but a schema violation here is a silent data-quality bug rather
// than a crash, so it is worth catching.
export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const;

const IngredientSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.number().positive(),
  unit: z.string().max(20),
  // Lets the shopping list skip what the user already has, and lets the plan
  // be judged on whether it actually used the pantry.
  from_pantry: z.boolean(),
});

const MealSchema = z.object({
  slot: z.enum(MEAL_SLOTS),
  name: z.string().min(1).max(120),
  cuisine: z.string().min(1).max(40),
  minutes: z.number().int().positive().max(240),
  servings: z.number().positive().max(20),
  estimated_cost_gbp: z.number().nonnegative().max(200),
  ingredients: z.array(IngredientSchema).min(1).max(20),
  steps: z.array(z.string().min(1).max(400)).min(1).max(12),
});

const DaySchema = z.object({
  // 0 = the first day of the plan, not a weekday: the plan does not care what
  // day of the week the user starts on.
  day_index: z.number().int().min(0).max(6),
  meals: z.array(MealSchema).min(1).max(3),
});

export const GeneratedMealPlanSchema = z.object({
  summary: z.string().min(1).max(400),
  days: z.array(DaySchema).min(1).max(7),
  estimated_total_gbp: z.number().nonnegative().max(1000),
  waste_reduction_tip: z.string().min(1).max(300),
});

export type GeneratedMealPlan = z.infer<typeof GeneratedMealPlanSchema>;
export type GeneratedMeal = z.infer<typeof MealSchema>;
export type GeneratedIngredient = z.infer<typeof IngredientSchema>;