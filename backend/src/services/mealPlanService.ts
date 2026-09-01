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
  MEAL_PLAN_SYSTEM_PROMPT,
} from '../utils/promptBuilder.ts';
import {
  findCuisineViolations,
  findMealCountViolation,
  type CuisineViolation,
  type MealCountViolation,
} from './cuisineCompliance.ts';
import { findViolations } from './ingredientSafety.ts';
import type { SafetyViolation } from './ingredientSafety.ts';
import { generateMealPlan as callModel } from './openai.ts';
import type { SupportedLocale } from '../utils/locale.ts';

// Free-tier allowance. Monthly rather than lifetime: a hard lifetime cap stops
// a user forming any habit at all, and at roughly half a penny per generation
// the cost of being generous here is negligible next to the conversion cost of
// a dead end.
const FREE_PLANS_PER_MONTH = 4;

// One retry only. If naming the violation explicitly does not fix it, a third
// attempt is unlikely to, and each one costs money and keeps the user waiting.
const MAX_ATTEMPTS = 2;

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
  locale: SupportedLocale = 'en'
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

  return `${buildMealPlanPrompt(profile, pantry, locale)}

YOUR PREVIOUS ATTEMPT WAS REJECTED.
${corrections.join('\n')}
Rebuild the whole plan and correct every issue above.`;
}

export async function generate(
  userId: string,
  modelCall: typeof callModel = callModel,
  locale: SupportedLocale = 'en'
): Promise<GenerateResult> {
  const profile =
    await profileRepository.findByUserId(userId);

  if (!profile || profile.cuisines.length === 0) {
    throw new AppError(
      'Choose at least one cuisine before generating a plan',
      'PROFILE_REQUIRED'
    );
  }

  // Check the quota before making a model call and spending money.
  const used =
    await aiUsageRepository.countSuccessfulThisMonth(
      userId,
      'meal-plan'
    );

  if (used >= FREE_PLANS_PER_MONTH) {
    throw new AppError(
      `You have used all ${FREE_PLANS_PER_MONTH} plans this month`,
      'QUOTA_EXCEEDED'
    );
  }

  const pantry =
    await pantryRepository.findAllByUser(userId);

  // This schema is built for the current user. If the user selected cuisines,
  // the generated meal cuisine field can only contain those values.
  const schema =
    buildMealPlanSchema(profile.cuisines);

  const systemPrompt = localizedSystemPrompt(locale);
  let userPrompt =
    buildMealPlanPrompt(profile, pantry, locale);

  let plan: GeneratedMealPlan | null = null;
  let attempts = 0;

  while (
    attempts < MAX_ATTEMPTS &&
    plan === null
  ) {
    attempts += 1;

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

    await aiUsageRepository.record(userId, {
      feature: 'meal-plan',
      model: generation.model,
      promptTokens: generation.promptTokens,
      completionTokens:
        generation.completionTokens,
      costUsd: generation.costUsd,
      succeeded:
        violations.length === 0 &&
        cuisineIssues.length === 0 &&
        mealCountIssue === null,
    });

    // Accept the plan only when both checks pass.
    if (
      violations.length === 0 &&
      cuisineIssues.length === 0 &&
      mealCountIssue === null
    ) {
      plan = generation.plan;
      break;
    }

    userPrompt = buildRetryPrompt(
      profile,
      pantry,
      violations,
      cuisineIssues,
      mealCountIssue,
      locale
    );
  }

  if (plan === null) {
    throw new AppError(
      'Could not produce a plan that respects your restrictions and cuisines',
      'GENERATION_FAILED'
    );
  }

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
  const used =
    await aiUsageRepository.countSuccessfulThisMonth(
      userId,
      'meal-plan'
    );

  return {
    used,
    limit: FREE_PLANS_PER_MONTH,
    remaining: Math.max(
      0,
      FREE_PLANS_PER_MONTH - used
    ),
  };
}
