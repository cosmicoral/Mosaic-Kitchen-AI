import * as profileRepository from '../repositories/profileRepository.ts';
import { AppError, COOKING_STYLES, CUISINES, PRIORITIES } from '../types/index.ts';
import type {
  Cuisine,
  CookingStyle,
  Priority,
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
    cuisines: parseFromList<Cuisine>(record.cuisines, CUISINES, 'cuisines'),
    avoid_ingredients: parseAvoidIngredients(record.avoid_ingredients),
    priorities: parseFromList<Priority>(record.priorities, PRIORITIES, 'priorities'),
    cooking_style: parseCookingStyle(record.cooking_style),
    postcode: parsePostcode(record.postcode),
  };

  return profileRepository.upsert(userId, input);
}