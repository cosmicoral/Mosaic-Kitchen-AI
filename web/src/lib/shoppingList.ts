import { apiFetch } from './api';
import type { ShoppingListItem, ShoppingListItemInput } from '../types';

export async function fetchShoppingList(): Promise<ShoppingListItem[]> {
  const data = await apiFetch<{ items: ShoppingListItem[] }>('/api/shopping-list');
  return data.items;
}

export async function generateShoppingList(): Promise<ShoppingListItem[]> {
  const data = await apiFetch<{ items: ShoppingListItem[] }>(
    '/api/shopping-list/generate',
    { method: 'POST' }
  );
  return data.items;
}

export async function addShoppingListItem(
  input: ShoppingListItemInput
): Promise<ShoppingListItem> {
  const data = await apiFetch<{ item: ShoppingListItem }>('/api/shopping-list/items', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.item;
}

export async function updateShoppingListItem(
  id: string,
  patch: { is_checked?: boolean; quantity?: number; name?: string }
): Promise<ShoppingListItem> {
  const data = await apiFetch<{ item: ShoppingListItem }>(
    `/api/shopping-list/items/${id}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  );
  return data.item;
}

export async function deleteShoppingListItem(id: string): Promise<void> {
  await apiFetch<null>(`/api/shopping-list/items/${id}`, { method: 'DELETE' });
}

export async function clearCheckedItems(): Promise<number> {
  const data = await apiFetch<{ removed: number }>('/api/shopping-list/checked', {
    method: 'DELETE',
  });
  return data.removed;
}