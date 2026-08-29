import * as aiUsageRepository from '../repositories/aiUsageRepository.ts';
import * as mealPlanRepository from '../repositories/mealPlanRepository.ts';
import * as pantryRepository from '../repositories/pantryRepository.ts';
import * as profileRepository from '../repositories/profileRepository.ts';
import { generateMealPlan as callModel } from './openai.ts';
import { findViolations } from './ingredientSafety.ts';
import { MEAL_PLAN_SYSTEM_PROMPT, buildMealPlanPrompt } from '../utils/promptBuilder.ts';
import { AppError } from '../types/index.ts';
import type { MealPlanRow } from '../repositories/mealPlanRepository.ts';
import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';

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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export interface GenerateResult {
  mealPlan: MealPlanRow;
  attempts: number;
}

export async function generate(userId: string): Promise<GenerateResult> {
  const profile = await profileRepository.findByUserId(userId);
  if (!profile) {
    throw new AppError(
      'Set up your preferences before generating a plan',
      'PROFILE_REQUIRED'
    );
  }

  // Checked before spending anything, not after.
  const used = await aiUsageRepository.countSuccessfulThisMonth(userId, 'meal-plan');
  if (used >= FREE_PLANS_PER_MONTH) {
    throw new AppError(
      `You have used all ${FREE_PLANS_PER_MONTH} plans this month`,
      'QUOTA_EXCEEDED'
    );
  }

  const pantry = await pantryRepository.findAllByUser(userId);

  const systemPrompt = MEAL_PLAN_SYSTEM_PROMPT;
  let userPrompt = buildMealPlanPrompt(profile, pantry);

  let plan: GeneratedMealPlan | null = null;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS && plan === null) {
    attempts += 1;

    let generation;
    try {
      generation = await callModel(systemPrompt, userPrompt);
    } catch (error) {
      // A failed call still cost money and still needs to show up in the spend
      // figures, but it must not consume the user's allowance.
      await aiUsageRepository.record(userId, {
        feature: 'meal-plan',
        model: process.env.OPENAI_MODEL ?? 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        succeeded: false,
      });
      console.error('Meal plan generation call failed:', error);
      throw new AppError('Could not generate a plan right now', 'GENERATION_FAILED');
    }

    const violations = findViolations(generation.plan, profile.avoid_ingredients);

    // Recorded per attempt: a retry is a second billable call, and a usage
    // table that hides retries understates real spend.
    await aiUsageRepository.record(userId, {
      feature: 'meal-plan',
      model: generation.model,
      promptTokens: generation.promptTokens,
      completionTokens: generation.completionTokens,
      costUsd: generation.costUsd,
      // Only the attempt that produced a usable plan counts against quota.
      succeeded: violations.length === 0,
    });

    if (violations.length === 0) {
      plan = generation.plan;
      break;
    }

    console.warn(
      `Meal plan attempt ${attempts} violated ${violations.length} restriction(s):`,
      violations
    );

    // Naming the exact dish and ingredient works far better than repeating the
    // original rule — the model already agreed to that rule and broke it.
    const detail = violations
      .map((violation) => `"${violation.foundIn}" in ${violation.meal} contains ${violation.avoided}`)
      .join('; ');

    userPrompt = `${buildMealPlanPrompt(profile, pantry)}

YOUR PREVIOUS ATTEMPT WAS REJECTED.
It included: ${detail}.
These are dietary restrictions and some are allergies. Choose different dishes
entirely rather than trying to substitute within the same ones.`;
  }

  if (plan === null) {
    throw new AppError(
      'Could not produce a plan that respects your restrictions',
      'GENERATION_FAILED'
    );
  }

  const saved = await mealPlanRepository.create(userId, today(), plan, profile);
  return { mealPlan: saved, attempts };
}

export async function getLatest(userId: string): Promise<MealPlanRow | null> {
  return mealPlanRepository.findLatestForUser(userId);
}

export async function getById(id: string, userId: string): Promise<MealPlanRow> {
  const found = await mealPlanRepository.findByIdForUser(id, userId);
  if (!found) throw new AppError('Meal plan not found', 'NOT_FOUND');
  return found;
}

export async function getQuota(userId: string) {
  const used = await aiUsageRepository.countSuccessfulThisMonth(userId, 'meal-plan');
  return {
    used,
    limit: FREE_PLANS_PER_MONTH,
    remaining: Math.max(0, FREE_PLANS_PER_MONTH - used),
  };
}