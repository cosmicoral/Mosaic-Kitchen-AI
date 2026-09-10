import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';
import { useLocale } from '../context/LocaleContext';
import { fetchLatestPantryCook } from '../lib/pantryCook';
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

  const { locale } = useLocale();

  // Set by clear(), so a dismissed result is not resurrected by a later
  // language switch. A ref rather than state: nothing renders from it, and
  // putting it in the dependency list would re-run the effect on dismissal —
  // which is precisely the fetch it exists to prevent.
  const dismissed = useRef(false);

  /**
   * Read whatever pantry cook is already stored, on mount and whenever the
   * reader's language changes.
   *
   * Two bugs in one absence. `result` used to be written only by cook(), which
   * meant the card vanished on reload — the plan was in the database and
   * nothing ever asked for it. And a plan generated in Chinese stayed in
   * Chinese after switching to English, because the server was never asked
   * again; the translation layer works on read, and there was no read.
   *
   * useDashboard has had this dependency since the locale work. This hook did
   * not, and the difference was invisible until a plan generated in one
   * language was looked at in the other.
   */
  useEffect(() => {
    if (dismissed.current) return;

    let cancelled = false;

    fetchLatestPantryCook()
      .then((plan) => {
        // A null answer means there is nothing stored, which is different from
        // a failed request — that one leaves whatever is on screen alone.
        if (!cancelled) setResult(plan);
      })
      .catch(() => {
        // Deliberately silent. This is a card on a page that is useful without
        // it; an error state over last week's dish suggestions would be worse
        // than their absence.
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

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
    dismissed.current = true;
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
      // A fresh cook un-dismisses: the user asked for this one.
      dismissed.current = false;
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
