import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { saveProfile } from '../lib/profile';
import type { UserProfileInput } from '../types';

const STORAGE_KEY = 'mk_onboarding_draft';

const EMPTY_DRAFT: UserProfileInput = {
  adults: 1,
  teenagers: 0,
  children: 0,
  toddlers: 0,
  meals_per_week: 7,
  weekly_budget: null,
  cuisines: [],
  cuisine_regions: [],
  seasoning_intensity: null,
  flavour_notes: [],
  low_salt: false,
  low_sugar: false,
  nutrition_focus: [],
  include_extras: [],
  extras_frequency: 'some',
  avoid_ingredients: [],
  priorities: [],
  cooking_style: null,
  postcode: null,
};

function readStoredDraft(): UserProfileInput {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<UserProfileInput>) };
  } catch {
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
  const [draft, setDraft] = useState<UserProfileInput>(readStoredDraft);

  // A ref mirroring the state, so submit can read the latest draft without
  // depending on it. The previous version read it by passing an updater to
  // setDraft and capturing the argument — React does not promise to run that
  // updater synchronously, and when it did not, submit sent the untouched
  // defaults and saved a blank profile.
  const draftRef = useRef<UserProfileInput>(draft);

  const update = useCallback((patch: Partial<UserProfileInput>) => {
    // Update the ref before asking React to render. This makes two updates, or
    // an update followed immediately by submit(), deterministic even when the
    // state update itself is batched.
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    writeStoredDraft(next);
    setDraft(next);
  }, []);

  const reset = useCallback(() => {
    draftRef.current = EMPTY_DRAFT;
    setDraft(EMPTY_DRAFT);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do; the in-memory reset already happened.
    }
  }, []);

  const submit = useCallback(async () => {
    // Fails loudly rather than writing a profile that makes the planner
    // useless. This is the last line of defence in the client; the server
    // enforces the same rule independently.
    if (draftRef.current.cuisines.length === 0) {
      throw new Error('Pick at least one cuisine before finishing setup');
    }
    await saveProfile(draftRef.current);
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
