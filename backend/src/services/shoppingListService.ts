import * as mealPlanRepository from '../repositories/mealPlanRepository.ts';
import * as shoppingListRepository from '../repositories/shoppingListRepository.ts';
import { aggregateShoppingList } from './ingredientAggregation.ts';
import { AppError, PANTRY_CATEGORIES } from '../types/index.ts';
import type { ShoppingListItem } from '../repositories/shoppingListRepository.ts';
import type { PantryCategory } from '../types/index.ts';

const MAX_NAME_LENGTH = 100;
const MAX_UNIT_LENGTH = 20;

function invalid(message: string): AppError {
  return new AppError(message, 'VALIDATION_ERROR');
}

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw invalid('Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

export async function getList(userId: string): Promise<ShoppingListItem[]> {
  return shoppingListRepository.findAllByUser(userId);
}

export async function generateFromLatestPlan(userId: string): Promise<ShoppingListItem[]> {
  const plan = await mealPlanRepository.findLatestForUser(userId);
  if (!plan) {
    throw new AppError('Generate a meal plan first', 'NOT_FOUND');
  }

  const items = aggregateShoppingList(plan.plan);
  return shoppingListRepository.replacePlanItems(userId, plan.id, items);
}

export async function addManualItem(
  userId: string,
  body: unknown
): Promise<ShoppingListItem> {
  const record = asRecord(body);

  if (typeof record.name !== 'string') throw invalid('name is required');
  const name = record.name.trim();
  if (name.length === 0) throw invalid('name is required');
  if (name.length > MAX_NAME_LENGTH) {
    throw invalid(`name must be at most ${MAX_NAME_LENGTH} characters`);
  }

  let quantity: number | null = null;
  if (record.quantity !== undefined && record.quantity !== null) {
    if (typeof record.quantity !== 'number' || !Number.isFinite(record.quantity)) {
      throw invalid('quantity must be a number');
    }
    if (record.quantity <= 0) throw invalid('quantity must be greater than zero');
    quantity = Math.round(record.quantity * 100) / 100;
  }

  let unit: string | null = null;
  if (typeof record.unit === 'string' && record.unit.trim().length > 0) {
    unit = record.unit.trim();
    if (unit.length > MAX_UNIT_LENGTH) {
      throw invalid(`unit must be at most ${MAX_UNIT_LENGTH} characters`);
    }
  }

  let category: PantryCategory = 'other';
  if (typeof record.category === 'string') {
    const candidate = record.category.trim().toLowerCase();
    if (!(PANTRY_CATEGORIES as readonly string[]).includes(candidate)) {
      throw invalid(`category must be one of: ${PANTRY_CATEGORIES.join(', ')}`);
    }
    category = candidate as PantryCategory;
  }

  return shoppingListRepository.createManual(userId, name, quantity, unit, category);
}

export async function updateItem(
  userId: string,
  id: string,
  body: unknown
): Promise<ShoppingListItem> {
  const record = asRecord(body);
  const patch: { is_checked?: boolean; quantity?: number | null; name?: string } = {};

  if ('is_checked' in record) {
    if (typeof record.is_checked !== 'boolean') throw invalid('is_checked must be a boolean');
    patch.is_checked = record.is_checked;
  }

  if ('quantity' in record && record.quantity !== null) {
    if (typeof record.quantity !== 'number' || record.quantity <= 0) {
      throw invalid('quantity must be a positive number');
    }
    patch.quantity = Math.round(record.quantity * 100) / 100;
  }

  if ('name' in record) {
    if (typeof record.name !== 'string' || record.name.trim().length === 0) {
      throw invalid('name cannot be blank');
    }
    patch.name = record.name.trim();
  }

  if (Object.keys(patch).length === 0) throw invalid('No updatable fields were provided');

  const item = await shoppingListRepository.update(id, userId, patch);
  if (!item) throw new AppError('Item not found', 'NOT_FOUND');
  return item;
}

export async function removeItem(userId: string, id: string): Promise<void> {
  const deleted = await shoppingListRepository.deleteByIdForUser(id, userId);
  if (!deleted) throw new AppError('Item not found', 'NOT_FOUND');
}

export async function clearChecked(userId: string): Promise<number> {
  return shoppingListRepository.deleteChecked(userId);
}