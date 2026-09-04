import * as aiUsageRepository from '../repositories/aiUsageRepository.ts';
import * as mealPlanRepository from '../repositories/mealPlanRepository.ts';
import * as pantryRepository from '../repositories/pantryRepository.ts';
import * as profileRepository from '../repositories/profileRepository.ts';
import type { MealPlanRow } from '../repositories/mealPlanRepository.ts';
import {
  buildMealPlanSchema,
  type GeneratedMealPlan,
} from '../schemas/mealPlan.ts';
import { AppError } from '../types/index.ts';
import {
  buildMealPlanPrompt,

  buildPantryCookPrompt,
  MEAL_PLAN_SYSTEM_PROMPT,
} from '../utils/promptBuilder.ts';
import {
  findCuisineViolations,
  findMealCountViolation,
  type CuisineViolation,
  type MealCountViolation,
} from './cuisineCompliance.ts';
import {
  findArithmeticViolation,
  findBudgetViolation,
  sumMealCosts,
  type ArithmeticViolation,
  type BudgetViolation,
} from './budgetCompliance.ts';
import { findViolations } from './ingredientSafety.ts';
import type { SafetyViolation } from './ingredientSafety.ts';
import * as billingService from './billingService.ts';
import { entitlementsFor } from './entitlements.ts';
import { assertFreeTierSpendAvailable } from './spendGuard.ts';
import { generateMealPlan as callModel } from './openai.ts';
import type { SupportedLocale } from '../utils/locale.ts';

// Allowances are monthly rather than lifetime: a hard lifetime cap stops a
// user forming any habit at all, and at roughly half a penny per generation
// the cost of being generous is negligible next to the conversion cost of a
// dead end. The numbers themselves live in entitlements.ts, keyed by tier.

// One retry only. If naming the violation explicitly does not fix it, a third
// attempt is unlikely to, and each one costs money and keeps the user waiting.
const MAX_ATTEMPTS = 2;

// How many previously-served dishes to name as off-limits. Enough to cover a
// couple of months of plans, small enough that the list never crowds out the
// rest of the prompt.
const RECENT_DISH_MEMORY = 40;

function today(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;
}

export interface GenerateResult {
  mealPlan: MealPlanRow;
  attempts: number;
}

export function localizedSystemPrompt(locale: SupportedLocale): string {
  const languageRule = locale === 'zh'
    ? 'LANGUAGE: Write summary, dish names, ingredient names, cooking steps and the waste-reduction tip in Simplified Chinese. Keep native_name in the dish\'s authentic original script. JSON keys and enum values must remain exactly as defined by the schema.'
    : 'LANGUAGE: Write all user-facing content in British English. Keep native_name in the dish\'s authentic original script.';
  return `${MEAL_PLAN_SYSTEM_PROMPT}\n\n${languageRule}`;
}

export function buildRetryPrompt(
  profile: Parameters<typeof buildMealPlanPrompt>[0],
  pantry: Parameters<typeof buildMealPlanPrompt>[1],
  safetyViolations: SafetyViolation[],
  cuisineIssues: CuisineViolation[],
  mealCountIssue: MealCountViolation | null,
  locale: SupportedLocale = 'en',
  recentDishes: readonly string[] = [],
  arithmeticIssue: ArithmeticViolation | null = null,
  budgetIssue: BudgetViolation | null = null
): string {
  const corrections: string[] = [];

  if (mealCountIssue) {
    corrections.push(
      `Return exactly ${mealCountIssue.expected} meals; the previous attempt returned ${mealCountIssue.actual}.`
    );
  }

  if (safetyViolations.length > 0) {
    const detail = safetyViolations
      .map(
        (violation) =>
          `"${violation.foundIn}" in ${violation.meal} contains ${violation.avoided}`
      )
      .join('; ');
    corrections.push(
      `Dietary restrictions were violated: ${detail}. Choose different dishes entirely rather than substituting within the same ones.`
    );
  }

  if (cuisineIssues.length > 0) {
    const detail = cuisineIssues
      .map(
        (issue) =>
          `${issue.cuisine}: ${issue.actual} meal(s), needs at least ${issue.expected}`
      )
      .join('; ');
    corrections.push(
      `Cuisine distribution was wrong: ${detail}. For each under-represented cuisine, choose a specific regional home dish and give its native name.`
    );
  }

  if (arithmeticIssue) {
    corrections.push(
      `estimated_total_gbp was £${arithmeticIssue.stated.toFixed(2)} but the meals ` +
        `add up to £${arithmeticIssue.summed.toFixed(2)}. Make the total the exact ` +
        `sum of every meal's estimated_cost_gbp.`
    );
  }

  if (budgetIssue) {
    const target = budgetIssue.budget.toFixed(2);
    const band = budgetIssue.tolerance.toFixed(2);
    corrections.push(
      budgetIssue.direction === 'over'
        ? `The plan costs £${budgetIssue.actual.toFixed(2)} against a £${target} budget. ` +
          `Bring it within £${band} of £${target} by choosing cheaper cuts, more pulses ` +
          `and vegetables, and dishes that share ingredients — not by shrinking portions.`
        : `The plan costs only £${budgetIssue.actual.toFixed(2)} against a £${target} budget. ` +
          `The household is willing to spend up to £${target}; use more of it on better ` +
          `protein, fresh produce and variety rather than returning a thinner plan.`
    );
  }

  return `${buildMealPlanPrompt(profile, pantry, locale, recentDishes)}

YOUR PREVIOUS ATTEMPT WAS REJECTED.
${corrections.join('\n')}
Rebuild the whole plan and correct every issue above.`;
}

// Mutates in place and recomputes the headline total, so the arithmetic check
// that runs next compares against what is actually left rather than against
// what the model was priced for.
export function stripUnwantedExtras(
  plan: GeneratedMealPlan,
  allowed: readonly string[]
): void {
  const permitted = new Set(allowed);

  for (const day of plan.days) {
    day.extras = (day.extras ?? []).filter((extra) => permitted.has(extra.kind));
  }

  plan.estimated_total_gbp = sumMealCosts(plan);
}

// Stage identifiers, not sentences. The wording belongs to the frontend,
// where it can be translated; sending prose from here would put user-facing
// English in the API and make it untranslatable.
export const GENERATION_STAGES = [
  'profile',
  'pantry',
  'generating',
  'checking',
  'retrying',
  'saving',
] as const;
export type GenerationStage = (typeof GENERATION_STAGES)[number];

export interface StageEvent {
  stage: GenerationStage;
  attempt: number;
  // Only set on 'retrying', and only ever the household's own words back at
  // them — an avoided ingredient they typed, or a cuisine they chose. Nothing
  // here comes from the model.
  detail?: string;
}

export type StageReporter = (event: StageEvent) => void;

const noopReporter: StageReporter = () => {};

export async function generate(
  userId: string,
  modelCall: typeof callModel = callModel,
  locale: SupportedLocale = 'en',
  onStage: StageReporter = noopReporter
): Promise<GenerateResult> {
  onStage({ stage: 'profile', attempt: 1 });
  const profile =
    await profileRepository.findByUserId(userId);

  if (!profile || profile.cuisines.length === 0) {
    throw new AppError(
      'Choose at least one cuisine before generating a plan',
      'PROFILE_REQUIRED'
    );
  }

  // Check the quota before making a model call and spending money.
  const tier = await billingService.getTier(userId);
  const limits = entitlementsFor(tier);

  // Checked before the per-user quota so the whole-product ceiling wins: a
  // user inside their own allowance still cannot push total spend past it.
  if (tier === 'free') await assertFreeTierSpendAvailable();

  const used =
    await aiUsageRepository.countSuccessfulThisMonth(
      userId,
      'meal-plan'
    );

  if (used >= limits.mealPlansPerMonth) {
    // The free wording is deliberately different. This is the one moment a
    // user is reaching for the product and cannot have it, which makes it the
    // highest-intent place in the app to say that a paid tier exists.
    throw new AppError(
      tier === 'free'
        ? `You have used your ${limits.mealPlansPerMonth} free plans this month`
        : `You have used all ${limits.mealPlansPerMonth} plans this month`,
      'QUOTA_EXCEEDED'
    );
  }

  onStage({ stage: 'pantry', attempt: 1 });
  const pantry =
    await pantryRepository.findAllByUser(userId);

  // This schema is built for the current user. If the user selected cuisines,
  // the generated meal cuisine field can only contain those values.
  const schema =
    buildMealPlanSchema(profile.cuisines);

  // Capped at 40: enough to cover a couple of months of plans, small enough
  // that the list never crowds out the rest of the prompt.
  const recentDishes =
    await mealPlanRepository.findRecentDishNames(userId, RECENT_DISH_MEMORY);

  const systemPrompt = localizedSystemPrompt(locale);
  let userPrompt =
    buildMealPlanPrompt(profile, pantry, locale, recentDishes);

  let plan: GeneratedMealPlan | null = null;
  let attempts = 0;

  while (
    attempts < MAX_ATTEMPTS &&
    plan === null
  ) {
    attempts += 1;
    onStage({ stage: 'generating', attempt: attempts });

    let generation;

    try {
      generation = await modelCall(
        systemPrompt,
        userPrompt,
        schema
      );
    } catch (error) {
      // A failed call may still cost money and should appear in usage records,
      // but it must not consume the user's successful-plan allowance.
      await aiUsageRepository.record(userId, {
        feature: 'meal-plan',
        model:
          process.env.OPENAI_MODEL ?? 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        succeeded: false,
      });

      console.error(
        'Meal plan generation call failed:',
        error
      );

      throw new AppError(
        'Could not generate a plan right now',
        'GENERATION_FAILED'
      );
    }

    onStage({ stage: 'checking', attempt: attempts });

    const violations = findViolations(
      generation.plan,
      profile.avoid_ingredients
    );

    const cuisineIssues =
      findCuisineViolations(
        generation.plan,
        profile.cuisines,
        profile.meals_per_week
      );

    const mealCountIssue = findMealCountViolation(
      generation.plan,
      profile.meals_per_week
    );

    // Strip extras the household did not ask for before anything else reads
    // the plan. The schema cannot express "only these kinds" cheaply, so this
    // is the deterministic gate: a low-sugar household that asked for fruit
    // never sees a dessert, whatever the model returned.
    stripUnwantedExtras(generation.plan, profile.include_extras);

    const arithmeticIssue = findArithmeticViolation(generation.plan);

    const budgetIssue = findBudgetViolation(
      generation.plan,
      profile.weekly_budget === null ? null : Number(profile.weekly_budget)
    );

    const isClean =
      violations.length === 0 &&
      cuisineIssues.length === 0 &&
      mealCountIssue === null &&
      arithmeticIssue === null &&
      budgetIssue === null;

    await aiUsageRepository.record(userId, {
      feature: 'meal-plan',
      model: generation.model,
      promptTokens: generation.promptTokens,
      completionTokens:
        generation.completionTokens,
      costUsd: generation.costUsd,
      succeeded: isClean,
    });

    // Accept the plan only when every check passes.
    if (isClean) {
      plan = generation.plan;
      break;
    }

    // The one stage worth naming a reason for. Without it a rejected first
    // attempt is thirty unexplained extra seconds; with it the user watches
    // the safety check do the thing they are paying for.
    onStage({
      stage: 'retrying',
      attempt: attempts,
      detail:
        violations.length > 0
          ? violations[0]!.avoided
          : cuisineIssues.length > 0
            ? cuisineIssues[0]!.cuisine
            : undefined,
    });

    userPrompt = buildRetryPrompt(
      profile,
      pantry,
      violations,
      cuisineIssues,
      mealCountIssue,
      locale,
      recentDishes,
      arithmeticIssue,
      budgetIssue
    );
  }

  if (plan === null) {
    throw new AppError(
      'Could not produce a plan that respects your restrictions and cuisines',
      'GENERATION_FAILED'
    );
  }

  onStage({ stage: 'saving', attempt: attempts });

  const saved =
    await mealPlanRepository.create(
      userId,
      today(),
      plan,
      profile
    );

  return {
    mealPlan: saved,
    attempts,
  };
}

const PANTRY_COOK_DISHES = 3;
const MAX_PANTRY_SELECTION = 12;

export interface PantryCookResult {
  mealPlan: MealPlanRow;
  attempts: number;
}

// Deliberately does not reuse generate(): the quota it spends, the prompt it
// builds and the row it writes are all different. Sharing the loop would mean
// a growing pile of "if this is a pantry cook" branches through the middle of
// the most safety-critical function in the app.
export async function generateFromPantry(
  userId: string,
  itemIds: readonly string[],
  modelCall: typeof callModel = callModel,
  locale: SupportedLocale = 'en',
  onStage: StageReporter = noopReporter
): Promise<PantryCookResult> {
  if (itemIds.length === 0) {
    throw new AppError('Choose at least one ingredient', 'VALIDATION_ERROR');
  }
  if (itemIds.length > MAX_PANTRY_SELECTION) {
    throw new AppError(
      `Choose at most ${MAX_PANTRY_SELECTION} ingredients — more than that and the dishes stop being about any of them`,
      'VALIDATION_ERROR'
    );
  }

  onStage({ stage: 'profile', attempt: 1 });

  const profile = await profileRepository.findByUserId(userId);
  if (!profile || profile.cuisines.length === 0) {
    throw new AppError(
      'Choose at least one cuisine before generating a plan',
      'PROFILE_REQUIRED'
    );
  }

  const tier = await billingService.getTier(userId);
  const limits = entitlementsFor(tier);

  // Counted under its own feature key, so cooking from the pantry never eats
  // into the weekly plan allowance and vice versa.
  if (tier === 'free') await assertFreeTierSpendAvailable();

  const used = await aiUsageRepository.countSuccessfulThisMonth(userId, 'pantry-cook');
  if (used >= limits.pantryCooksPerMonth) {
    throw new AppError(
      tier === 'free'
        ? `You have used your ${limits.pantryCooksPerMonth} free pantry cooks this month`
        : `You have used all ${limits.pantryCooksPerMonth} pantry cooks this month`,
      'QUOTA_EXCEEDED'
    );
  }

  onStage({ stage: 'pantry', attempt: 1 });

  const pantry = await pantryRepository.findAllByUser(userId);
  const wanted = new Set(itemIds);
  const selected = pantry.filter((item) => wanted.has(item.id));

  // Checked against what the user actually owns rather than trusting the ids:
  // otherwise a stale tab could ask for someone else's pantry item.
  if (selected.length === 0) {
    throw new AppError('Those ingredients are not in your pantry', 'NOT_FOUND');
  }

  const schema = buildMealPlanSchema(profile.cuisines);
  const recentDishes = await mealPlanRepository.findRecentDishNames(
    userId,
    RECENT_DISH_MEMORY
  );

  const dishes = Math.min(PANTRY_COOK_DISHES, Math.max(1, selected.length));
  const systemPrompt = localizedSystemPrompt(locale);
  let userPrompt = buildPantryCookPrompt(profile, selected, dishes, locale, recentDishes);

  let plan: GeneratedMealPlan | null = null;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS && plan === null) {
    attempts += 1;
    onStage({ stage: 'generating', attempt: attempts });

    let generation;
    try {
      generation = await modelCall(systemPrompt, userPrompt, schema);
    } catch (error) {
      await aiUsageRepository.record(userId, {
        feature: 'pantry-cook',
        model: process.env.OPENAI_MODEL ?? 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        succeeded: false,
      });
      console.error('Pantry cook generation failed:', error);
      throw new AppError('Could not suggest dishes right now', 'GENERATION_FAILED');
    }

    onStage({ stage: 'checking', attempt: attempts });

    stripUnwantedExtras(generation.plan, []);

    // The allergen scan runs here exactly as it does for a weekly plan. A
    // shorter answer is not a less dangerous one.
    const violations = findViolations(generation.plan, profile.avoid_ingredients);
    const mealCountIssue = findMealCountViolation(generation.plan, dishes);
    const arithmeticIssue = findArithmeticViolation(generation.plan);

    const isClean =
      violations.length === 0 && mealCountIssue === null && arithmeticIssue === null;

    await aiUsageRepository.record(userId, {
      feature: 'pantry-cook',
      model: generation.model,
      promptTokens: generation.promptTokens,
      completionTokens: generation.completionTokens,
      costUsd: generation.costUsd,
      succeeded: isClean,
    });

    if (isClean) {
      plan = generation.plan;
      break;
    }

    onStage({
      stage: 'retrying',
      attempt: attempts,
      detail: violations[0]?.avoided,
    });

    userPrompt = buildRetryPrompt(
      profile,
      selected,
      violations,
      [],
      mealCountIssue,
      locale,
      recentDishes,
      arithmeticIssue,
      null
    );
  }

  if (plan === null) {
    throw new AppError(
      'Could not suggest dishes that respect your restrictions',
      'GENERATION_FAILED'
    );
  }

  onStage({ stage: 'saving', attempt: attempts });

  const saved = await mealPlanRepository.create(userId, today(), plan, profile, 'pantry');
  return { mealPlan: saved, attempts };
}

export async function getLatestPantryCook(userId: string): Promise<MealPlanRow | null> {
  return mealPlanRepository.findLatestForUser(userId, 'pantry');
}

export async function getLatest(
  userId: string
): Promise<MealPlanRow | null> {
  return mealPlanRepository.findLatestForUser(
    userId
  );
}

export async function getById(
  id: string,
  userId: string
): Promise<MealPlanRow> {
  const found =
    await mealPlanRepository.findByIdForUser(
      id,
      userId
    );

  if (!found) {
    throw new AppError(
      'Meal plan not found',
      'NOT_FOUND'
    );
  }

  return found;
}

export async function getQuota(
  userId: string
) {
  const tier = await billingService.getTier(userId);
  const limit = entitlementsFor(tier).mealPlansPerMonth;

  // No spend guard here. This is a read the dashboard makes on every load, and
  // throwing would take the whole page down rather than blocking the one
  // action that costs money.
  const used =
    await aiUsageRepository.countSuccessfulThisMonth(
      userId,
      'meal-plan'
    );

  // The tier travels with the quota so the frontend can decide between "you
  // are out until next month" and an upgrade prompt without a second request.
  return {
    tier,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}
