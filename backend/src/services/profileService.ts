import * as profileRepository from '../repositories/profileRepository.ts';
import {
  AppError,
  COOKING_STYLES,
  CUISINES,
  EXTRAS_FREQUENCIES,
  EXTRA_KINDS,
  FLAVOUR_NOTES,
  PRIORITIES,
  SEASONING_INTENSITIES,
  isCuisineRegion,
} from '../types/index.ts';
import type {
  Cuisine,
  CookingStyle,
  ExtraKind,
  ExtrasFrequency,
  FlavourNote,
  Priority,
  SeasoningIntensity,
  UserProfile,
  UserProfileInput,
} from '../types/index.ts';

const MAX_PEOPLE_PER_BAND = 20;
const MAX_MEALS_PER_WEEK = 21;
const MAX_BUDGET = 10_000;
const MAX_AVOID_ITEMS = 30;
const MAX_AVOID_LENGTH = 50;

// Loose on purpose. UK postcodes have many valid shapes and a strict regex
// tends to reject real ones; this catches obvious rubbish and leaves proper
// verification to a lookup service if that is ever added.
const POSTCODE_PATTERN = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;

function invalid(message: string): AppError {
  return new AppError(message, 'VALIDATION_ERROR');
}

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw invalid('Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

function parseCount(value: unknown, field: string): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw invalid(`${field} must be a whole number`);
  }
  if (value < 0 || value > MAX_PEOPLE_PER_BAND) {
    throw invalid(`${field} must be between 0 and ${MAX_PEOPLE_PER_BAND}`);
  }
  return value;
}

// One generic helper for all three closed lists, so adding a new one later
// means adding a constant rather than another near-identical function.
function parseFromList<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid(`${field} must be an array`);

  const normalised = value.map((entry) => {
    if (typeof entry !== 'string') throw invalid(`${field} must contain only strings`);
    const candidate = entry.trim().toLowerCase() as T;
    if (!allowed.includes(candidate)) {
      throw invalid(`${field} contains an unknown value: ${entry}`);
    }
    return candidate;
  });

  // Set removes duplicates; a UI bug sending the same cuisine twice should not
  // reach the database.
  return [...new Set(normalised)];
}

function parseAvoidIngredients(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid('avoid_ingredients must be an array');
  if (value.length > MAX_AVOID_ITEMS) {
    throw invalid(`avoid_ingredients cannot hold more than ${MAX_AVOID_ITEMS} entries`);
  }

  const cleaned = value.map((entry) => {
    if (typeof entry !== 'string') {
      throw invalid('avoid_ingredients must contain only strings');
    }
    const trimmed = entry.trim().toLowerCase();
    if (trimmed.length === 0) throw invalid('avoid_ingredients cannot contain blanks');
    if (trimmed.length > MAX_AVOID_LENGTH) {
      throw invalid(`Each avoided ingredient must be at most ${MAX_AVOID_LENGTH} characters`);
    }
    return trimmed;
  });

  return [...new Set(cleaned)];
}

function parseBudget(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalid('weekly_budget must be a number');
  }
  if (value <= 0) throw invalid('weekly_budget must be greater than zero');
  if (value > MAX_BUDGET) throw invalid('weekly_budget is unrealistically large');
  return Math.round(value * 100) / 100;
}

function parseCookingStyle(value: unknown): CookingStyle | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw invalid('cooking_style must be a string');
  const style = value.trim().toLowerCase() as CookingStyle;
  if (!COOKING_STYLES.includes(style)) {
    throw invalid(`cooking_style must be one of: ${COOKING_STYLES.join(', ')}`);
  }
  return style;
}

// Validated against the catalogue rather than accepted as free text, and
// filtered against the cuisines actually chosen — a region for a cuisine the
// household did not select is dead weight in the prompt, and usually means the
// UI left a stale selection behind when they unticked the cuisine.
function parseCuisineRegions(value: unknown, cuisines: readonly Cuisine[]): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid('cuisine_regions must be an array');

  const cleaned = value.map((entry) => {
    if (typeof entry !== 'string') {
      throw invalid('cuisine_regions must contain only strings');
    }
    const candidate = entry.trim().toLowerCase();
    if (!isCuisineRegion(candidate)) {
      throw invalid(`cuisine_regions contains an unknown value: ${entry}`);
    }
    return candidate;
  });

  const selected = new Set<string>(cuisines);
  return [...new Set(cleaned)].filter((entry) => selected.has(entry.split(':')[0]!));
}

function parseSeasoningIntensity(value: unknown): SeasoningIntensity | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw invalid('seasoning_intensity must be a string');

  const candidate = value.trim().toLowerCase() as SeasoningIntensity;
  if (!SEASONING_INTENSITIES.includes(candidate)) {
    throw invalid(`seasoning_intensity must be one of: ${SEASONING_INTENSITIES.join(', ')}`);
  }
  return candidate;
}

function parseExtrasFrequency(value: unknown): ExtrasFrequency {
  if (value === undefined || value === null || value === '') return 'some';
  if (typeof value !== 'string') throw invalid('extras_frequency must be a string');

  const candidate = value.trim().toLowerCase() as ExtrasFrequency;
  if (!EXTRAS_FREQUENCIES.includes(candidate)) {
    throw invalid(`extras_frequency must be one of: ${EXTRAS_FREQUENCIES.join(', ')}`);
  }
  return candidate;
}

function parseBoolean(value: unknown, field: string): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== 'boolean') throw invalid(`${field} must be true or false`);
  return value;
}

function parsePostcode(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw invalid('postcode must be a string');

  // Normalise before validating so "sw1a1aa" and "SW1A 1AA" are treated the
  // same, and so the stored form is always canonical.
  const compact = value.replace(/\s+/g, '').toUpperCase();
  if (!POSTCODE_PATTERN.test(compact)) {
    throw invalid('postcode does not look like a UK postcode');
  }

  // Canonical UK format puts a space before the final three characters.
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

function parseMealsPerWeek(value: unknown): number {
  if (value === undefined || value === null) return 7;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw invalid('meals_per_week must be a whole number');
  }
  if (value < 1 || value > MAX_MEALS_PER_WEEK) {
    throw invalid(`meals_per_week must be between 1 and ${MAX_MEALS_PER_WEEK}`);
  }
  return value;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  return profileRepository.findByUserId(userId);
}

export async function saveProfile(userId: string, body: unknown): Promise<UserProfile> {
  const record = asRecord(body);

  const adults = parseCount(record.adults, 'adults');
  const teenagers = parseCount(record.teenagers, 'teenagers');
  const children = parseCount(record.children, 'children');
  const toddlers = parseCount(record.toddlers, 'toddlers');
  const cuisines = parseFromList<Cuisine>(record.cuisines, CUISINES, 'cuisines');

  // The planner has nothing to work with without this, and a profile that
  // silently saves with none produces plausible-looking but useless plans —
  // a failure that shows up days later in the output rather than here.
  if (cuisines.length === 0) {
    throw invalid('Choose at least one cuisine');
  }

  // Mirrors the CHECK constraint, but produces a message a person can act on
  // instead of a raw Postgres constraint violation.
  if (adults + teenagers + children + toddlers < 1) {
    throw invalid('Your household needs at least one person');
  }

  const input: UserProfileInput = {
    adults,
    teenagers,
    children,
    toddlers,
    meals_per_week: parseMealsPerWeek(record.meals_per_week),
    weekly_budget: parseBudget(record.weekly_budget),
    cuisines,
    cuisine_regions: parseCuisineRegions(record.cuisine_regions, cuisines),
    seasoning_intensity: parseSeasoningIntensity(record.seasoning_intensity),
    flavour_notes: parseFromList<FlavourNote>(
      record.flavour_notes,
      FLAVOUR_NOTES,
      'flavour_notes'
    ),
    low_salt: parseBoolean(record.low_salt, 'low_salt'),
    low_sugar: parseBoolean(record.low_sugar, 'low_sugar'),
    include_extras: parseFromList<ExtraKind>(
      record.include_extras,
      EXTRA_KINDS,
      'include_extras'
    ),
    extras_frequency: parseExtrasFrequency(record.extras_frequency),
    avoid_ingredients: parseAvoidIngredients(record.avoid_ingredients),
    priorities: parseFromList<Priority>(record.priorities, PRIORITIES, 'priorities'),
    cooking_style: parseCookingStyle(record.cooking_style),
    postcode: parsePostcode(record.postcode),
  };

  return profileRepository.upsert(userId, input);
}
