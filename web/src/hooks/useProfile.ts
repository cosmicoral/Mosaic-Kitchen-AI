import { useCallback, useEffect, useState } from 'react';
import { fetchProfile, profileToInput, saveProfile } from '../lib/profile';
import type { UserProfile, UserProfileInput } from '../types';

type ProfileStatus = 'loading' | 'ready' | 'error';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      // null is a valid answer: it means onboarding has not been done yet.
      setProfile(await fetchProfile());
      setStatus('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your profile');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // PUT replaces the whole row, so callers hand over a complete input. The
  // helper below is what makes that practical.
  const save = useCallback(async (input: UserProfileInput) => {
    const saved = await saveProfile(input);
    setProfile(saved);
    return saved;
  }, []);

  // Change one or two fields without blanking the rest: read the current
  // profile, apply the patch, send the whole thing back.
  const patch = useCallback(
    async (changes: Partial<UserProfileInput>) => {
      if (!profile) throw new Error('No profile to update yet');
      return save({ ...profileToInput(profile), ...changes });
    },
    [profile, save]
  );

  return { profile, status, error, refresh, save, patch };
}