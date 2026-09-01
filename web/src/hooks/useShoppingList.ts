import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import {
  addShoppingListItem,
  clearCheckedItems,
  deleteShoppingListItem,
  fetchShoppingList,
  generateShoppingList,
  updateShoppingListItem,
} from '../lib/shoppingList';
import type { ShoppingListItem, ShoppingListItemInput } from '../types';

type Status = 'loading' | 'ready' | 'error';

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<{ message: string; code: string | null } | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setItems(await fetchShoppingList());
      setStatus('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your list');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      setItems(await generateShoppingList());
      return true;
    } catch (caught) {
      setGenerateError({
        message: caught instanceof Error ? caught.message : 'Could not build your list',
        code: caught instanceof ApiError ? caught.code : null,
      });
      return false;
    } finally {
      setGenerating(false);
    }
  }, []);

  // Ticking things off happens repeatedly and fast, often on a phone with poor
  // signal in a shop. Waiting on the round trip would make the list feel dead.
  const toggle = useCallback(async (item: ShoppingListItem) => {
    const next = !item.is_checked;
    setItems((previous) =>
      previous.map((entry) => (entry.id === item.id ? { ...entry, is_checked: next } : entry))
    );

    try {
      await updateShoppingListItem(item.id, { is_checked: next });
    } catch (caught) {
      setItems((previous) =>
        previous.map((entry) =>
          entry.id === item.id ? { ...entry, is_checked: item.is_checked } : entry
        )
      );
      throw caught;
    }
  }, []);

  const addItem = useCallback(async (input: ShoppingListItemInput) => {
    const created = await addShoppingListItem(input);
    setItems((previous) => [...previous, created]);
  }, []);

  const removeItem = useCallback(async (id: string) => {
    let snapshot: ShoppingListItem[] = [];
    setItems((previous) => {
      snapshot = previous;
      return previous.filter((entry) => entry.id !== id);
    });
    try {
      await deleteShoppingListItem(id);
    } catch (caught) {
      setItems(snapshot);
      throw caught;
    }
  }, []);

  const clearChecked = useCallback(async () => {
    const removed = await clearCheckedItems();
    setItems((previous) => previous.filter((entry) => !entry.is_checked));
    return removed;
  }, []);

  return {
    items, status, error, refresh,
    generate, generating, generateError,
    toggle, addItem, removeItem, clearChecked,
  };
}