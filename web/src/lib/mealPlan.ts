import { apiFetch } from './api';
import type { MealPlanQuota, MealPlanRecord } from '../types';

export async function fetchLatestMealPlan(): Promise<MealPlanRecord | null> {
  const data = await apiFetch<{ mealPlan: MealPlanRecord | null }>('/api/meal-plan/latest');
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