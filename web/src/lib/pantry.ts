import { apiFetch } from './api';
import type { PantryItem, PantryItemInput } from '../types';

export async function fetchPantryItems(): Promise<PantryItem[]> {
  const data = await apiFetch<{ items: PantryItem[] }>('/api/pantry');
  return data.items;
}

export async function fetchExpiringItems(withinDays = 7): Promise<PantryItem[]> {
  const data = await apiFetch<{ items: PantryItem[] }>(
    `/api/pantry/expiring?days=${withinDays}`
  );
  return data.items;
}

export async function createPantryItem(input: PantryItemInput): Promise<PantryItem> {
  const data = await apiFetch<{ item: PantryItem }>('/api/pantry', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.item;
}

export async function updatePantryItem(
  id: string,
  patch: Partial<PantryItemInput>
): Promise<PantryItem> {
  const data = await apiFetch<{ item: PantryItem }>(`/api/pantry/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.item;
}

export async function deletePantryItem(id: string): Promise<void> {
  await apiFetch<null>(`/api/pantry/${id}`, { method: 'DELETE' });
}