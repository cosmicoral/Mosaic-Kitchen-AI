import { apiFetch } from './api';
import type { MealPlanRecord } from '../types';

export async function cookFromPantry(itemIds: string[]): Promise<MealPlanRecord> {
  const data = await apiFetch<{ mealPlan: MealPlanRecord }>(
    '/api/meal-plan/pantry-cook',
    { method: 'POST', body: JSON.stringify({ item_ids: itemIds }) }
  );
  return data.mealPlan;
}

export async function fetchLatestPantryCook(): Promise<MealPlanRecord | null> {
  const data = await apiFetch<{ mealPlan: MealPlanRecord | null }>(
    '/api/meal-plan/pantry-cook/latest'
  );
  return data.mealPlan;
}
