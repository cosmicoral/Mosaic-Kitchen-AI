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
import type { PantryItem, UserProfile } from '../types/index.ts';
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
import { translatePlan } from './planTranslator.ts';
import {
  describeLanguageViolation,
  findLanguageViolation,
  type LanguageViolation,
} from './languageCompliance.ts';
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
    : 'LANGUAGE: Write all user-facing content in British English — summary, dish names, ingredient names, cooking steps and the tip. Some ingredient and region names below are given to you in Chinese; translate them into English in your answer rather than copying them through. The single exception is native_name, which stays in the dish\'s authentic original script.';
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
  budgetIssue: BudgetViolation | null = null,
  languageIssue: LanguageViolation | null = null
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

  if (languageIssue) {
    corrections.push(describeLanguageViolation(languageIssue));
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
// Five stages, because there are five things the server actually does. An
// earlier draft of this list had eight, including "prioritising expiry",
// "selecting cuisines" and "balancing nutrition" — none of which are steps.
// Expiry sorting and region sampling are single lines while the prompt is
// being assembled, and nothing in this service balances nutrition at all.
// Lighting up eight rows in sequence would be a fabricated workflow, which is
// the same lie as fabricated reasoning, just drawn instead of written.
//
// 'building_meals' is the only long one — it is the model call, and it is
// 90% of the wall clock. The other four are tens of milliseconds each.
export const GENERATION_STAGES = [
  'analysing_profile',
  'checking_pantry',
  'building_meals',
  'reviewing',
  'finalising',
] as const;
export type GenerationStage = (typeof GENERATION_STAGES)[number];

export interface StageEvent {
  stage: GenerationStage;
  attempt: number;
  // Set when a rejected attempt sends us round again, and only ever the
  // household's own words back at them — an avoided ingredient they typed, or
  // a cuisine they chose. Nothing here comes from the model.
  retryReason?: string;
}

// Facts about the request, known before the model answers. That is what makes
// them safe to show during the wait: they describe the inputs the plan is
// being built from, not predictions about the output.
export const INSIGHT_KEYS = [
  'profile_signals',
  'pantry_reusable',
  'pantry_empty',
  'expiry_soonest',
  'budget_target',
  'culture_regions',
  'selection_items',
] as const;
export type InsightKey = (typeof INSIGHT_KEYS)[number];

export interface InsightEvent {
  key: InsightKey;
  // Values, not sentences. The wording lives in the frontend so it can be
  // translated; sending prose from here would strand English in the API.
  data: Record<string, string | number | string[]>;
}

export type StageReporter = (event: StageEvent) => void;
export type InsightReporter = (event: InsightEvent) => void;

export interface Reporters {
  onStage?: StageReporter;
  onInsight?: InsightReporter;
}

const noopReporter: StageReporter = () => {};
const noopInsight: InsightReporter = () => {};

// Counts the preference fields the household actually filled in. Used for
// "planning around N signals from your kitchen", which is only worth saying
// because it is countable — it is the number of inputs, not a score.
function countProfileSignals(profile: UserProfile): number {
  const filled = [
    profile.cuisines.length > 0,
    profile.cuisine_regions.length > 0,
    profile.avoid_ingredients.length > 0,
    profile.priorities.length > 0,
    profile.flavour_notes.length > 0,
    profile.nutrition_focus.length > 0,
    profile.seasoning_intensity !== null,
    profile.cooking_style !== null,
    profile.weekly_budget !== null,
    profile.low_salt || profile.low_sugar,
    profile.include_extras.length > 0,
  ];
  return filled.filter(Boolean).length;
}

// Everything reported here is read straight off the profile and the pantry.
// Nothing is estimated, and nothing is about the plan that has not been
// generated yet.
function reportRequestInsights(
  profile: UserProfile,
  pantry: PantryItem[],
  onInsight: InsightReporter
): void {
  onInsight({ key: 'profile_signals', data: { count: countProfileSignals(profile) } });

  if (pantry.length > 0) {
    onInsight({ key: 'pantry_reusable', data: { count: pantry.length } });
    reportSoonestExpiry(pantry, onInsight);
  } else {
    onInsight({ key: 'pantry_empty', data: {} });
  }

  if (profile.weekly_budget !== null) {
    onInsight({ key: 'budget_target', data: { amount: Number(profile.weekly_budget) } });
  }

  reportCultureRegions(profile, onInsight);
}

// Pulled out of reportRequestInsights so the pantry flow can emit these two
// without the weekly-shop ones it has no business claiming.
function reportSoonestExpiry(items: PantryItem[], onInsight: InsightReporter): void {
  const dated = items
    .filter((item): item is PantryItem & { expires_on: string } => Boolean(item.expires_on))
    .sort((a, b) => a.expires_on.localeCompare(b.expires_on));

  const soonest = dated[0];
  if (!soonest) return;

  const days = Math.ceil(
    (Date.parse(`${soonest.expires_on}T00:00:00Z`) - Date.now()) / 86_400_000
  );
  onInsight({ key: 'expiry_soonest', data: { name: soonest.name, days } });
}

// The regions actually going into this prompt, chosen or rotated. Not a
// claim about what will come back — a statement of what was asked for.
function reportCultureRegions(profile: UserProfile, onInsight: InsightReporter): void {
  const regions =
    profile.cuisine_regions.length > 0 ? profile.cuisine_regions : profile.cuisines;
  if (regions.length > 0) {
    onInsight({ key: 'culture_regions', data: { list: regions.slice(0, 4) } });
  }
}

export async function generate(
  userId: string,
  modelCall: typeof callModel = callModel,
  locale: SupportedLocale = 'en',
  onStage: StageReporter = noopReporter,
  onInsight: InsightReporter = noopInsight
): Promise<GenerateResult> {
  onStage({ stage: 'analysing_profile', attempt: 1 });
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

  onStage({ stage: 'checking_pantry', attempt: 1 });
  const pantry =
    await pantryRepository.findAllByUser(userId);

  reportRequestInsights(profile, pantry, onInsight);

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
    onStage({ stage: 'building_meals', attempt: attempts });

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

    onStage({ stage: 'reviewing', attempt: attempts });

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

    // Checked last because it is the only one that can be true of an
    // otherwise perfect plan: right meals, right budget, wrong language.
    const languageIssue = findLanguageViolation(generation.plan, locale);

    const isClean =
      violations.length === 0 &&
      cuisineIssues.length === 0 &&
      mealCountIssue === null &&
      arithmeticIssue === null &&
      budgetIssue === null &&
      languageIssue === null;

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

    const onlyLanguageLeft =
      languageIssue !== null &&
      violations.length === 0 &&
      cuisineIssues.length === 0 &&
      mealCountIssue === null &&
      arithmeticIssue === null &&
      budgetIssue === null;

    // Out of attempts and the only complaint is the language: take it. An
    // allergen or a doubled budget is a reason to show nothing; a Chinese dish
    // name in an English plan is a reason to be slightly annoyed. Throwing
    // here would spend the user's quota and hand back an error instead of a
    // perfectly safe week of dinners.
    if (onlyLanguageLeft && attempts >= MAX_ATTEMPTS) {
      console.warn(
        `Accepting a plan in the wrong language after ${attempts} attempts:`,
        languageIssue
      );
      plan = generation.plan;
      break;
    }

    // The one stage worth naming a reason for. Without it a rejected first
    // attempt is thirty unexplained extra seconds; with it the user watches
    // the safety check do the thing they are paying for.
    onStage({
      stage: 'building_meals',
      attempt: attempts + 1,
      retryReason:
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
      budgetIssue,
      languageIssue
    );
  }

  if (plan === null) {
    throw new AppError(
      'Could not produce a plan that respects your restrictions and cuisines',
      'GENERATION_FAILED'
    );
  }

  onStage({ stage: 'finalising', attempt: attempts });

  const saved =
    await mealPlanRepository.create(
      userId,
      today(),
      plan,
      profile,
      'weekly',
      locale
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
  onStage: StageReporter = noopReporter,
  onInsight: InsightReporter = noopInsight
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

  onStage({ stage: 'analysing_profile', attempt: 1 });

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

  onStage({ stage: 'checking_pantry', attempt: 1 });

  const pantry = await pantryRepository.findAllByUser(userId);
  const wanted = new Set(itemIds);
  const selected = pantry.filter((item) => wanted.has(item.id));

  // Checked against what the user actually owns rather than trusting the ids:
  // otherwise a stale tab could ask for someone else's pantry item.
  if (selected.length === 0) {
    throw new AppError('Those ingredients are not in your pantry', 'NOT_FOUND');
  }

  // Named back to the user rather than counted: the whole promise of this flow
  // is that the dishes are about these specific things.
  onInsight({
    key: 'selection_items',
    data: { list: selected.map((item) => item.name) },
  });

  // Deliberately not reportRequestInsights(). That reports on a weekly shop:
  // it would announce a weekly budget this flow does not spend, and count
  // "ingredients already in your kitchen" — which is the selection we just
  // named, said a second time. Only the two that are true of three dishes
  // made from a chosen handful are emitted here.
  onInsight({
    key: 'profile_signals',
    data: { count: countProfileSignals(profile) },
  });
  reportSoonestExpiry(selected, onInsight);
  reportCultureRegions(profile, onInsight);

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
    onStage({ stage: 'building_meals', attempt: attempts });

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

    onStage({ stage: 'reviewing', attempt: attempts });

    stripUnwantedExtras(generation.plan, []);

    // The allergen scan runs here exactly as it does for a weekly plan. A
    // shorter answer is not a less dangerous one.
    const violations = findViolations(generation.plan, profile.avoid_ingredients);
    const mealCountIssue = findMealCountViolation(generation.plan, dishes);
    const arithmeticIssue = findArithmeticViolation(generation.plan);

    const languageIssue = findLanguageViolation(generation.plan, locale);

    const isClean =
      violations.length === 0 &&
      mealCountIssue === null &&
      arithmeticIssue === null &&
      languageIssue === null;

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

    // Same judgement as the weekly flow: language gives way, safety does not.
    const onlyLanguageLeft =
      languageIssue !== null && violations.length === 0 && mealCountIssue === null &&
      arithmeticIssue === null;

    if (onlyLanguageLeft && attempts >= MAX_ATTEMPTS) {
      console.warn(
        `Accepting dishes in the wrong language after ${attempts} attempts:`,
        languageIssue
      );
      plan = generation.plan;
      break;
    }

    onStage({
      stage: 'building_meals',
      attempt: attempts + 1,
      retryReason: violations[0]?.avoided,
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
      null,
      languageIssue
    );
  }

  if (plan === null) {
    throw new AppError(
      'Could not suggest dishes that respect your restrictions',
      'GENERATION_FAILED'
    );
  }

  onStage({ stage: 'finalising', attempt: attempts });

  const saved = await mealPlanRepository.create(
    userId,
    today(),
    plan,
    profile,
    'pantry',
    locale
  );
  return { mealPlan: saved, attempts };
}

// Every read goes through readInLocale, so a stored plan is handed back in the
// language the reader is actually using. The row's own locale field stays as
// it was — this returns a view of the plan, not a rewrite of it.
export async function getLatestPantryCook(
  userId: string,
  locale: SupportedLocale = 'en'
): Promise<MealPlanRow | null> {
  const found = await mealPlanRepository.findLatestForUser(userId, 'pantry');
  if (!found) return null;
  return { ...found, plan: await readInLocale(found, locale) };
}

export async function getLatest(
  userId: string,
  locale: SupportedLocale = 'en'
): Promise<MealPlanRow | null> {
  const found = await mealPlanRepository.findLatestForUser(userId);
  if (!found) return null;
  return { ...found, plan: await readInLocale(found, locale) };
}

export async function getById(
  id: string,
  userId: string,
  locale: SupportedLocale = 'en'
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

  return { ...found, plan: await readInLocale(found, locale) };
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

// Returns the plan in the language the reader is using. The stored plan is
// never modified: a translation is an extra row, produced once and then cached
// for good, so the second time anyone opens this plan in this language it
// costs nothing.
//
// Failure here is deliberately soft. If the translation call fails the reader
// gets the plan in its original language, which is the same thing they had
// before this existed — a language mismatch is not a reason to show an error
// page instead of dinner.
export async function readInLocale(
  row: mealPlanRepository.MealPlanRow,
  locale: SupportedLocale
): Promise<GeneratedMealPlan> {
  if (row.locale === locale) return row.plan;

  const cached = await mealPlanRepository.findTranslation(row.id, locale);
  if (cached) return cached;

  try {
    const result = await translatePlan(row.plan, locale);
    const complete = result.translated === result.total;

    await aiUsageRepository.record(row.user_id, {
      feature: 'plan-translate',
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      costUsd: result.costUsd,
      succeeded: complete,
    });

    if (!complete) {
      // Loud, because the symptom otherwise is a page that just looks like the
      // language toggle does nothing.
      console.warn(
        `Plan ${row.id} translated ${result.translated}/${result.total} strings into ${locale}.`
      );
    }

    // Only a complete translation is cached. A partial one cached is a
    // half-Chinese page that never retries, which is worse than paying for a
    // second attempt on the next page load.
    if (complete) {
      await mealPlanRepository.saveTranslation(row.id, locale, result.plan);
    }

    return result.plan;
  } catch (error) {
    console.error(`Could not translate plan ${row.id} into ${locale}:`, error);
    return row.plan;
  }
}
