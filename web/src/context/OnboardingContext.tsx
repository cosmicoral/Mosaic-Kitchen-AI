import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { saveProfile } from '../lib/profile';
import type { UserProfileInput } from '../types';

// Onboarding spans three screens but only writes once at the end, so the draft
// has to outlive each page. It also survives a refresh via sessionStorage —
// losing three screens of answers to a stray reload is a bad first impression.
const STORAGE_KEY = 'mk_onboarding_draft';

const EMPTY_DRAFT: UserProfileInput = {
  adults: 1,
  teenagers: 0,
  children: 0,
  toddlers: 0,
  meals_per_week: 7,
  weekly_budget: null,
  cuisines: [],
  avoid_ingredients: [],
  priorities: [],
  cooking_style: null,
  postcode: null,
};

function readStoredDraft(): UserProfileInput {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    // Spread over the defaults so a draft saved by an older version of the app
    // cannot leave a field undefined.
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<UserProfileInput>) };
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) and stored
    // JSON can be corrupt. Neither is worth breaking onboarding over.
    return EMPTY_DRAFT;
  }
}

function writeStoredDraft(draft: UserProfileInput): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Best effort: the draft still lives in memory for this session.
  }
}

interface OnboardingContextValue {
  draft: UserProfileInput;
  update: (patch: Partial<UserProfileInput>) => void;
  submit: () => Promise<void>;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Lazy initialiser: the function form runs once on mount instead of on every
  // render, so sessionStorage is not read repeatedly.
  const [draft, setDraft] = useState<UserProfileInput>(readStoredDraft);

  const update = useCallback((patch: Partial<UserProfileInput>) => {
    setDraft((previous) => {
      const next = { ...previous, ...patch };
      writeStoredDraft(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do; the in-memory reset already happened.
    }
  }, []);

  const submit = useCallback(async () => {
    // draft is read through the setter so submit never closes over a stale
    // value — otherwise a change made on the last screen could be missed.
    let current = EMPTY_DRAFT;
    setDraft((previous) => {
      current = previous;
      return previous;
    });

    await saveProfile(current);
    reset();
  }, [reset]);

  const value = useMemo(
    () => ({ draft, update, submit, reset }),
    [draft, update, submit, reset]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used inside an OnboardingProvider');
  }
  return context;
}