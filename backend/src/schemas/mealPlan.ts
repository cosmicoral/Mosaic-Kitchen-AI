import { z } from 'zod';

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const;

const IngredientSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.number().positive(),
  unit: z.string().max(20),
  from_pantry: z.boolean(),
});

// Built per request rather than defined once, because the set of acceptable
// cuisines is a property of the user, not of the application. Passing them as
// an enum makes the constraint structural: with OpenAI structured outputs the
// model is decoded against this schema, so a cuisine outside the list is not
// discouraged, it is unrepresentable.
export function buildMealPlanSchema(allowedCuisines: readonly string[]) {
  const CuisineSchema =
    allowedCuisines.length > 0
      ? z.enum(allowedCuisines as [string, ...string[]])
      : z.string().min(1).max(40);

  const MealSchema = z.object({
    slot: z.enum(MEAL_SLOTS),
    name: z.string().min(1).max(120),
    // The dish's name in its own language and script. This is the difference
    // between a meal planner that happens to include Chinese food and one that
    // knows it is Chinese food — and it is a check on the model: a dish it
    // cannot name natively is usually one it invented.
    native_name: z.string().trim().min(1).max(120),
    cuisine: CuisineSchema,
    minutes: z.number().int().positive().max(240),
    servings: z.number().positive().max(20),
    estimated_cost_gbp: z.number().nonnegative().max(200),
    ingredients: z.array(IngredientSchema).min(1).max(20),
    steps: z.array(z.string().min(1).max(400)).min(1).max(12),
  });

  const DaySchema = z.object({
    day_index: z.number().int().min(0).max(6),
    meals: z.array(MealSchema).min(1).max(3),
  });

  return z.object({
    summary: z.string().min(1).max(400),
    days: z.array(DaySchema).min(1).max(7),
    estimated_total_gbp: z.number().nonnegative().max(1000),
    waste_reduction_tip: z.string().min(1).max(300),
  });
}

// A permissive instance for types and for any caller that has no profile.
export const GeneratedMealPlanSchema = buildMealPlanSchema([]);

export type GeneratedMealPlan = z.infer<typeof GeneratedMealPlanSchema>;
export type GeneratedMeal = GeneratedMealPlan['days'][number]['meals'][number];
export type GeneratedIngredient = GeneratedMeal['ingredients'][number];
