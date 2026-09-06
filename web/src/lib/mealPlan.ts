import { apiFetch } from './api';
import type { MealPlanQuota, MealPlanRecord } from '../types';

// detail=full asks the server to translate the cooking steps and ingredient
// names too, when the plan was written in the other language. Left off by
// default because the steps are two thirds of the translation cost and most of
// them are never read — the page asks for them the moment somebody opens a
// recipe, and not before.
export async function fetchLatestMealPlan(
  detail: 'card' | 'full' = 'card'
): Promise<MealPlanRecord | null> {
  const data = await apiFetch<{ mealPlan: MealPlanRecord | null }>(
    `/api/meal-plan/latest${detail === 'full' ? '?detail=full' : ''}`
  );
  return data.mealPlan;
}

export async function fetchQuota(): Promise<MealPlanQuota> {
  const data = await apiFetch<{ quota: MealPlanQuota }>('/api/meal-plan/quota');
  return data.quota;
}

export async function generateMealPlan(): Promise<MealPlanRecord> {
  const data = await apiFetch<{ mealPlan: MealPlanRecord; attempts: number }>(
    '/api/meal-plan',
    { method: 'POST' }
  );
  return data.mealPlan;
}