import { apiFetch } from './api';
import type { UserProfile, UserProfileInput } from '../types';

export async function fetchProfile(): Promise<UserProfile | null> {
  const data = await apiFetch<{ profile: UserProfile | null }>('/api/profile');
  return data.profile;
}

// PUT replaces the whole row, so callers must always send a complete input.
// Sending a partial object would silently blank everything left out.
export async function saveProfile(input: UserProfileInput): Promise<UserProfile> {
  const data = await apiFetch<{ profile: UserProfile }>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return data.profile;
}

// The API returns NUMERIC as a string; forms need a number.
export function profileToInput(profile: UserProfile): UserProfileInput {
  return {
    adults: profile.adults,
    teenagers: profile.teenagers,
    children: profile.children,
    toddlers: profile.toddlers,
    meals_per_week: profile.meals_per_week,
    weekly_budget: profile.weekly_budget === null ? null : Number(profile.weekly_budget),
    cuisines: profile.cuisines,
    cuisine_regions: profile.cuisine_regions,
    seasoning_intensity: profile.seasoning_intensity,
    flavour_notes: profile.flavour_notes,
    low_salt: profile.low_salt,
    low_sugar: profile.low_sugar,
    nutrition_focus: profile.nutrition_focus,
    include_extras: profile.include_extras,
    extras_frequency: profile.extras_frequency,
    avoid_ingredients: profile.avoid_ingredients,
    priorities: profile.priorities,
    cooking_style: profile.cooking_style,
    postcode: profile.postcode,
  };
}