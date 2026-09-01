import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { saveProfile } from '../lib/profile';
import type { UserProfileInput } from '../types';
import {
  OnboardingProvider,
  useOnboarding,
} from './OnboardingContext';

vi.mock('../lib/profile', () => ({
  saveProfile: vi.fn().mockResolvedValue(undefined),
}));

let onboarding: ReturnType<typeof useOnboarding> | null = null;

function Harness() {
  onboarding = useOnboarding();
  return null;
}

beforeEach(() => {
  onboarding = null;
  sessionStorage.clear();
  vi.mocked(saveProfile).mockClear();
});

afterEach(() => {
  cleanup();
});

describe('OnboardingProvider', () => {
  test('submit uses every update made before React flushes a render', async () => {
    render(
      <OnboardingProvider>
        <Harness />
      </OnboardingProvider>
    );

    expect(onboarding).not.toBeNull();

    await act(async () => {
      onboarding!.update({ cuisines: ['chinese'] });
      onboarding!.update({ meals_per_week: 14, priorities: ['cultural-authenticity'] });
      await onboarding!.submit();
    });

    expect(saveProfile).toHaveBeenCalledTimes(1);
    const submitted = vi.mocked(saveProfile).mock.calls[0]![0] as UserProfileInput;
    expect(submitted.cuisines).toEqual(['chinese']);
    expect(submitted.meals_per_week).toBe(14);
    expect(submitted.priorities).toEqual(['cultural-authenticity']);
  });

  test('submit rejects a draft without a cuisine', async () => {
    render(
      <OnboardingProvider>
        <Harness />
      </OnboardingProvider>
    );

    await expect(onboarding!.submit()).rejects.toThrow(/at least one cuisine/i);
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
