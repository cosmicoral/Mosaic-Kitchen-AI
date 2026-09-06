import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { fetchLatestMealPlan, fetchQuota } from '../lib/mealPlan';
import {
  streamMealPlan,
  type InsightEvent,
  type StageEvent,
} from '../lib/mealPlanStream';
import type { MealPlanQuota, MealPlanRecord } from '../types';
import { useLocale } from '../context/LocaleContext';

type MealPlanStatus = 'loading' | 'ready' | 'error';

export interface GenerationFailure {
  message: string;
  // Carried through so the page can offer the right next step — top up, finish
  // onboarding, or just try again — without parsing the message text.
  code: string | null;
}

export function useMealPlan() {
  const { locale } = useLocale();

  const [plan, setPlan] = useState<MealPlanRecord | null>(null);
  const [quota, setQuota] = useState<MealPlanQuota | null>(null);
  const [status, setStatus] = useState<MealPlanStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<GenerationFailure | null>(null);
  // Every stage seen so far, not just the current one. A list that grows shows
  // progress; a single line that changes looks like a stuck spinner that
  // occasionally flickers.
  const [stages, setStages] = useState<StageEvent[]>([]);
  const [insights, setInsights] = useState<InsightEvent[]>([]);
  // Held true for a beat after the stream closes so the card can say "ready"
  // on the plating pose before the results replace it. An abrupt swap loses
  // the one moment the wait pays off.
  const [finishing, setFinishing] = useState(false);

  // Whether the recipe text has been fetched in the reader's language yet.
  // One request per plan, the first time a recipe is opened.
  const [detailLoaded, setDetailLoaded] = useState(false);

  const loadRecipeDetail = useCallback(async () => {
    if (detailLoaded) return;
    setDetailLoaded(true);

    try {
      const full = await fetchLatestMealPlan('full');
      if (full) setPlan(full);
    } catch {
      // Silent on purpose. The steps are already on screen in the language the
      // plan was written in; an error card over a translation nobody asked for
      // by name would be noise, and the retry is simply opening it again.
      setDetailLoaded(false);
    }
  }, [detailLoaded]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      // Both are needed before the page can render anything useful, and they
      // do not depend on each other, so they go out together.
      const [latest, currentQuota] = await Promise.all([fetchLatestMealPlan(), fetchQuota()]);
      setPlan(latest);
      setDetailLoaded(false);
      setQuota(currentQuota);
      setStatus('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your meal plan');
      setStatus('error');
    }
  }, []);

  // locale is a dependency, not decoration: the summary, dish names and steps
  // arrive translated by the server, so the language toggle has to refetch
  // them. Before this, switching language left whatever had already been
  // fetched on screen and looked exactly like the toggle doing nothing.
  useEffect(() => {
    void refresh();
  }, [refresh, locale]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setGenerationError(null);
    setStages([]);
    setInsights([]);
    setFinishing(false);

    try {
      const created = await streamMealPlan({
        onStage: (event) =>
          // Replaces any earlier event for the same stage rather than
          // appending, so a retry reuses its row instead of printing the whole
          // sequence twice.
          setStages((previous) => [
            ...previous.filter((entry) => entry.stage !== event.stage),
            event,
          ]),
        onInsight: (event) =>
          setInsights((previous) =>
            previous.some((entry) => entry.key === event.key)
              ? previous
              : [...previous, event]
          ),
      });

      // Plating pose plus "ready", then hand over. 800ms is long enough to
      // register and short enough not to be in the way.
      setFinishing(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
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
      setFinishing(false);
    }
  }, []);

  return {
    plan, quota, status, error, refresh,
    generate, generating, generationError, stages, insights, finishing,
    loadRecipeDetail,
  };
}