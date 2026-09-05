import { useCallback, useState } from 'react';
import { ApiError } from '../lib/api';
import {
  streamMealPlan,
  type InsightEvent,
  type StageEvent,
} from '../lib/mealPlanStream';
import type { MealPlanRecord } from '../types';

// The most a selection can be before the dishes stop being about any of it.
// Mirrors the server's limit so the button can say why rather than the server
// rejecting a request the user was allowed to make.
export const MAX_SELECTION = 12;

export interface CookFailure {
  message: string;
  code: string | null;
}

export function usePantryCook() {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<MealPlanRecord | null>(null);
  const [cooking, setCooking] = useState(false);
  const [error, setError] = useState<CookFailure | null>(null);
  // Same shape as the weekly flow, so one progress component serves both.
  const [stages, setStages] = useState<StageEvent[]>([]);
  const [insights, setInsights] = useState<InsightEvent[]>([]);
  const [finishing, setFinishing] = useState(false);

  // No cap on selecting. The same selection also drives bulk delete, where
  // picking twenty things is entirely reasonable — so the limit belongs on the
  // cook button, which can say why, rather than on the tick box, which would
  // just stop responding.
  const toggle = useCallback((id: string) => {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((entry) => entry !== id)
        : [...previous, id]
    );
  }, []);

  const selectMany = useCallback((ids: string[]) => setSelected(ids), []);

  const clear = useCallback(() => {
    setSelected([]);
    setResult(null);
    setError(null);
    setStages([]);
    setInsights([]);
  }, []);

  const cook = useCallback(async () => {
    if (selected.length === 0) return null;

    setCooking(true);
    setError(null);
    setStages([]);
    setInsights([]);
    setFinishing(false);

    try {
      const plan = await streamMealPlan(
        {
          onStage: (event) =>
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
        },
        { pantryItemIds: selected }
      );

      setFinishing(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setResult(plan);
      return plan;
    } catch (caught) {
      setError({
        message: caught instanceof Error ? caught.message : 'Could not suggest dishes',
        code: caught instanceof ApiError ? caught.code : null,
      });
      return null;
    } finally {
      setCooking(false);
      setFinishing(false);
    }
  }, [selected]);

  return {
    selected, toggle, selectMany, clear,
    cook, cooking, result, error, setResult,
    stages, insights, finishing,
  };
}
