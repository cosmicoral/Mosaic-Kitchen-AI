import * as pantryRepository from '../repositories/pantryRepository.ts';
import { AppError, PANTRY_CATEGORIES } from '../types/index.ts';
import type {
    PantryCategory,
    PantryItem,
    PantryItemInput,
    PantryItemPatch,
} from '../types/index.ts';

const MAX_NAME_LENGTH = 100;
const MAX_UNIT_LENGTH = 20;
const MAX_QUANTITY = 100_000;
const MAX_WINDOW_DAYS = 365;
const DEFAULT_WINDOW_DAYS = 7;


// Deliberately strict: YYYY-MM-DD only. Accepting anything Date can parse
// would let "next tuesday" or a full timestamp through and store something
// the UI never expects.

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function invalid(message: string): AppError {
  return new AppError(message, 'VALIDATION_ERROR');
}

// A type predicate: inside any `if (isPantryCategory(x))` branch TypeScript
// narrows x from string to PantryCategory, so no cast is needed at the call
// site.
function isPantryCategory(value: string): value is PantryCategory {
  return (PANTRY_CATEGORIES as readonly string[]).includes(value);
}

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw invalid('Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

function parseName(value: unknown): string {
  if (typeof value !== 'string') throw invalid('name must be a string');
  const name = value.trim();
  if (name.length === 0) throw invalid('name is required');
  if (name.length > MAX_NAME_LENGTH) {
    throw invalid(`name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  return name;
}

function parseCategory(value: unknown): PantryCategory {
  if (typeof value !== 'string') throw invalid('category must be a string');
  const category = value.trim().toLowerCase();
  if (!isPantryCategory(category)) {
    throw invalid(`category must be one of: ${PANTRY_CATEGORIES.join(', ')}`);
  }
  return category;
}

function parseQuantity(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalid('quantity must be a number');
  }
  if (value <= 0) throw invalid('quantity must be greater than zero');
  if (value > MAX_QUANTITY) throw invalid('quantity is unrealistically large');
  // The column is NUMERIC(10, 2). Rounding here means the value that comes
  // back out is the value the caller sent, rather than one Postgres quietly
  // truncated.
  return Math.round(value * 100) / 100;
}

function parseUnit(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw invalid('unit must be a string');
  const unit = value.trim();
  if (unit.length === 0) return null;
  if (unit.length > MAX_UNIT_LENGTH) {
    throw invalid(`unit must be at most ${MAX_UNIT_LENGTH} characters`);
  }
  return unit;
}

function parseExpiresOn(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw invalid('expires_on must be a string');
  if (!ISO_DATE_PATTERN.test(value)) {
    throw invalid('expires_on must be formatted YYYY-MM-DD');
  }

  // Date happily rolls 2026-02-31 over into 2026-03-03, so the format check
  // alone is not enough. Round-tripping catches days that do not exist.
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw invalid('expires_on is not a real date');
  }

  return value;
}

function parseWindowDays(value: unknown): number {
  if (value === undefined) return DEFAULT_WINDOW_DAYS;
  // Query strings are always strings, so coerce before validating.
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > MAX_WINDOW_DAYS) {
    throw invalid(`days must be a whole number between 0 and ${MAX_WINDOW_DAYS}`);
  }
  return days;
}

export async function listItems(userId: string): Promise<PantryItem[]> {
  return pantryRepository.findAllByUser(userId);
}

export async function listExpiring(
  userId: string,
  windowDays: unknown
): Promise<PantryItem[]> {
  return pantryRepository.findExpiringForUser(userId, parseWindowDays(windowDays));
}

export async function addItem(userId: string, body: unknown): Promise<PantryItem> {
  const record = asRecord(body);

  const input: PantryItemInput = {
    name: parseName(record.name),
    category: parseCategory(record.category),
    quantity: parseQuantity(record.quantity),
    unit: parseUnit(record.unit),
    expires_on: parseExpiresOn(record.expires_on),
  };

  return pantryRepository.create(userId, input);
}

export async function updateItem(
  userId: string,
  id: string,
  body: unknown
): Promise<PantryItem> {
  const record = asRecord(body);
  const patch: PantryItemPatch = {};

  // `in` rather than a truthiness check: PATCH means "change the fields I
  // sent", and a field sent as null or 0 was still sent.
  if ('name' in record) patch.name = parseName(record.name);
  if ('category' in record) patch.category = parseCategory(record.category);
  if ('quantity' in record) patch.quantity = parseQuantity(record.quantity);
  if ('unit' in record) patch.unit = parseUnit(record.unit);
  if ('expires_on' in record) patch.expires_on = parseExpiresOn(record.expires_on);

  if (Object.keys(patch).length === 0) {
    throw invalid('No updatable fields were provided');
  }

  const item = await pantryRepository.update(id, userId, patch);
  if (!item) throw new AppError('Pantry item not found', 'NOT_FOUND');
  return item;
}

export async function removeItem(userId: string, id: string): Promise<void> {
  const deleted = await pantryRepository.deleteByIdForUser(id, userId);
  if (!deleted) throw new AppError('Pantry item not found', 'NOT_FOUND');
}