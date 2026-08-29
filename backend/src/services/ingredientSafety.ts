import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';

// The prompt asks the model not to use avoided ingredients. This checks that it
// actually did. A prompt is a request; an allergy needs a guarantee.
export interface SafetyViolation {
  avoided: string;
  foundIn: string;
  meal: string;
}

// Crude singularisation, deliberately: "peanuts" and "peanut" must match, and a
// real stemmer would be a dependency for one job.
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word));
}

// Every token of the avoided phrase has to appear in the ingredient. Matching
// on whole tokens rather than substrings is what stops "butter" flagging
// "butternut squash", while "tree nuts" still catches "chopped tree nuts".
function mentions(ingredientName: string, avoided: string): boolean {
  const ingredientTokens = new Set(tokenise(ingredientName));
  const avoidedTokens = tokenise(avoided);
  if (avoidedTokens.length === 0) return false;
  return avoidedTokens.every((token) => ingredientTokens.has(token));
}

export function findViolations(
  plan: GeneratedMealPlan,
  avoidIngredients: string[]
): SafetyViolation[] {
  if (avoidIngredients.length === 0) return [];

  const violations: SafetyViolation[] = [];

  for (const day of plan.days) {
    for (const meal of day.meals) {
      // The dish name matters too: "Peanut Noodles" listing no peanut is still
      // wrong, and usually means the model substituted silently.
      const surfaces = [meal.name, ...meal.ingredients.map((item) => item.name)];

      for (const avoided of avoidIngredients) {
        for (const surface of surfaces) {
          if (mentions(surface, avoided)) {
            violations.push({ avoided, foundIn: surface, meal: meal.name });
          }
        }
      }
    }
  }

  return violations;
}