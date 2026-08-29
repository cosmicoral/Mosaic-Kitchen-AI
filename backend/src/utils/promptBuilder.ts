import type { PantryItem, UserProfile } from '../types/index.ts';

// Portion multipliers. Teenagers eat more than adults; toddlers far less.
// A single headcount would get both wrong, in opposite directions.
const PORTION_WEIGHTS = {
  adults: 1,
  teenagers: 1.2,
  children: 0.6,
  toddlers: 0.4,
} as const;

export function calculateServings(profile: UserProfile): number {
  const total =
    profile.adults * PORTION_WEIGHTS.adults +
    profile.teenagers * PORTION_WEIGHTS.teenagers +
    profile.children * PORTION_WEIGHTS.children +
    profile.toddlers * PORTION_WEIGHTS.toddlers;

  // Half-serving granularity: finer than that is false precision in a recipe.
  return Math.max(1, Math.round(total * 2) / 2);
}

function describeHousehold(profile: UserProfile): string {
  const parts: string[] = [];
  if (profile.adults) parts.push(`${profile.adults} adult(s)`);
  if (profile.teenagers) parts.push(`${profile.teenagers} teenager(s)`);
  if (profile.children) parts.push(`${profile.children} child(ren) aged 5-12`);
  if (profile.toddlers) parts.push(`${profile.toddlers} toddler(s) aged 1-4`);
  return parts.join(', ');
}

function describePantry(items: PantryItem[]): string {
  if (items.length === 0) {
    return 'The pantry is empty. Assume everything has to be bought.';
  }

  // Sorted by expiry so the most urgent items are read first — models weight
  // what appears early in a list, and this is the list that matters most.
  const sorted = [...items].sort((a, b) => {
    if (a.expires_on && b.expires_on) return a.expires_on.localeCompare(b.expires_on);
    if (a.expires_on) return -1;
    if (b.expires_on) return 1;
    return 0;
  });

  return sorted
    .map((item) => {
      const amount =
        item.quantity && item.unit
          ? ` (${Number(item.quantity)}${item.unit})`
          : item.quantity
            ? ` (${Number(item.quantity)})`
            : '';
      const expiry = item.expires_on ? `, use by ${item.expires_on}` : '';
      return `- ${item.name}${amount}${expiry}`;
    })
    .join('\n');
}

// Kept separate from the user message: instructions that must never bend go in
// the system role, where they are harder for anything in the user content to
// talk the model out of.
export const MEAL_PLAN_SYSTEM_PROMPT = `You are a meal planner for multicultural households in the UK.

Absolute rules, in order of priority:
1. Never include an ingredient the household avoids, in any form, including as
   an oil, sauce, stock, garnish or trace. Some of these are allergies. If a
   dish would normally contain one, either substitute it explicitly or choose a
   different dish.
2. If the household includes toddlers, avoid whole nuts, whole grapes, popcorn
   and large hard chunks, and keep chilli heat mild.
3. Use ingredients the household already has before suggesting new ones, and
   prioritise the ones expiring soonest.
4. Stay within the weekly budget when one is given. Prices are UK supermarket
   prices in GBP.
5. Cook only within the stated time preference.

Write recipes that are genuinely of the cuisines requested — real dishes people
cook at home, not generic fusion. Steps should be concise and practical.`;

export function buildMealPlanPrompt(profile: UserProfile, pantry: PantryItem[]): string {
  const servings = calculateServings(profile);
  const budget = profile.weekly_budget ? `£${Number(profile.weekly_budget).toFixed(2)}` : 'not specified';

  const timeGuidance: Record<string, string> = {
    quick: 'Under 25 minutes per meal.',
    balanced: '30 to 45 minutes per meal.',
    batch: 'Favour dishes that cook once and reheat well for several meals.',
    relaxed: 'Up to an hour is fine.',
  };

  // Restated even though it is in the system prompt: this is the one constraint
  // where a failure is a safety incident rather than a bad recommendation.
  const avoid =
    profile.avoid_ingredients.length > 0
      ? `MUST NOT APPEAR ANYWHERE: ${profile.avoid_ingredients.join(', ')}`
      : 'No ingredient restrictions.';

  return `Plan ${profile.meals_per_week} meals.

HOUSEHOLD
${describeHousehold(profile)}
Cook each recipe for ${servings} servings.

${avoid}

CUISINES
${profile.cuisines.length > 0 ? profile.cuisines.join(', ') : 'no preference stated'}

BUDGET
Weekly total: ${budget}

TIME
${profile.cooking_style ? timeGuidance[profile.cooking_style] : 'No strong preference.'}

WHAT MATTERS MOST
${profile.priorities.length > 0 ? profile.priorities.join(', ') : 'balanced'}

ALREADY IN THE KITCHEN
${describePantry(pantry)}

Mark every ingredient the household already has with from_pantry: true.
Spread the meals across days, starting at day_index 0.`;
}