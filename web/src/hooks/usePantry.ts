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

  // Reports how many actually went, rather than throwing on the first
  // failure: with twenty deletes in flight, "three of these did not delete" is
  // a more useful outcome than rolling all twenty back because one 404'd.
  const removeItems = useCallback(
    async (ids: string[]): Promise<{ removed: number; failed: number }> => {
      const wanted = new Set(ids);
      let snapshot: PantryItem[] = [];

      setItems((previous) => {
        snapshot = previous;
        return previous.filter((item) => !wanted.has(item.id));
      });

      const outcomes = await Promise.allSettled(ids.map((id) => deletePantryItem(id)));
      const failedIds = ids.filter((_, index) => outcomes[index]?.status === 'rejected');

      // Put back only the ones that failed, so the successful deletes stay
      // gone and the list still matches the server.
      if (failedIds.length > 0) {
        const restore = new Set(failedIds);
        setItems((previous) =>
          sortItems([...previous, ...snapshot.filter((item) => restore.has(item.id))])
        );
      }

      return { removed: ids.length - failedIds.length, failed: failedIds.length };
    },
    []
  );

  return { items, status, error, refresh, addItem, removeItem, removeItems };
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