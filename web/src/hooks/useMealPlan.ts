import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { fetchLatestMealPlan, fetchQuota, generateMealPlan } from '../lib/mealPlan';
import type { MealPlanQuota, MealPlanRecord } from '../types';

type MealPlanStatus = 'loading' | 'ready' | 'error';

export interface GenerationFailure {
  message: string;
  // Carried through so the page can offer the right next step — top up, finish
  // onboarding, or just try again — without parsing the message text.
  code: string | null;
}

export function useMealPlan() {
  const [plan, setPlan] = useState<MealPlanRecord | null>(null);
  const [quota, setQuota] = useState<MealPlanQuota | null>(null);
  const [status, setStatus] = useState<MealPlanStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<GenerationFailure | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      // Both are needed before the page can render anything useful, and they
      // do not depend on each other, so they go out together.
      const [latest, currentQuota] = await Promise.all([fetchLatestMealPlan(), fetchQuota()]);
      setPlan(latest);
      setQuota(currentQuota);
      setStatus('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your meal plan');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setGenerationError(null);

    try {
      const created = await generateMealPlan();
      setPlan(created);
      // Refetched rather than decremented locally: the server decides what
      // counts, and a retry inside one request could consume differently.
      setQuota(await fetchQuota());
      return created;
    } catch (caught) {
      setGenerationError({
        message: caught instanceof Error ? caught.message : 'Could not generate a plan',
        code: caught instanceof ApiError ? ((caught as ApiError & { code?: string }).code ?? null) : null,
      });
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  return { plan, quota, status, error, refresh, generate, generating, generationError };
}