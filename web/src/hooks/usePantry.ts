import { useCallback, useEffect, useState } from 'react';
import {
  createPantryItem,
  deletePantryItem,
  fetchPantryItems,
} from '../lib/pantry';
import type { PantryItem, PantryItemInput } from '../types';

type PantryStatus = 'loading' | 'ready' | 'error';

export function usePantry() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [status, setStatus] = useState<PantryStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setItems(await fetchPantryItems());
      setStatus('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your pantry');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(async (input: PantryItemInput) => {
    // Not optimistic: the server assigns the id and the created/updated
    // timestamps, so there is nothing meaningful to render until it answers.
    const created = await createPantryItem(input);
    setItems((previous) => sortItems([...previous, created]));
  }, []);

  const removeItem = useCallback(async (id: string) => {
    // Optimistic: a delete has an obvious expected outcome, and waiting on the
    // round trip makes the UI feel broken. Snapshot first so a failure can be
    // rolled back.
    let snapshot: PantryItem[] = [];
    setItems((previous) => {
      snapshot = previous;
      return previous.filter((item) => item.id !== id);
    });

    try {
      await deletePantryItem(id);
    } catch (caught) {
      setItems(snapshot);
      throw caught;
    }
  }, []);

  return { items, status, error, refresh, addItem, removeItem };
}

// Mirrors the server's ORDER BY so the list does not reshuffle between a local
// update and the next refresh.
function sortItems(items: PantryItem[]): PantryItem[] {
  return [...items].sort((a, b) => {
    if (a.expires_on && b.expires_on) return a.expires_on.localeCompare(b.expires_on);
    if (a.expires_on) return -1;
    if (b.expires_on) return 1;
    return a.name.localeCompare(b.name);
  });
}