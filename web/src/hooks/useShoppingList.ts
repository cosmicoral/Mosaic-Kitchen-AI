import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { createPantryItem } from '../lib/pantry';
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

  // Returns the removed row so the caller can offer an undo. Recreating it is
  // the only honest way back — the delete has already reached the server, and
  // pretending otherwise by holding the request would make every delete feel
  // slow to protect against the rare mistake.
  const removeItem = useCallback(
    async (id: string): Promise<ShoppingListItem | null> => {
      let snapshot: ShoppingListItem[] = [];
      let removed: ShoppingListItem | null = null;

      setItems((previous) => {
        snapshot = previous;
        removed = previous.find((entry) => entry.id === id) ?? null;
        return previous.filter((entry) => entry.id !== id);
      });

      try {
        await deleteShoppingListItem(id);
        return removed;
      } catch (caught) {
        setItems(snapshot);
        throw caught;
      }
    },
    []
  );

  // Undo after a delete. The restored row is a new one with a new id, which
  // matters only if something held a reference to the old one — nothing here
  // does, and the alternative is a soft-delete column and a cleanup job for a
  // row that exists for eight seconds.
  const restoreItem = useCallback(async (item: ShoppingListItem) => {
    const created = await addShoppingListItem({
      name: item.name,
      quantity: item.quantity === null ? null : Number(item.quantity),
      unit: item.unit,
      category: item.category,
    });
    setItems((previous) => [...previous, created]);
  }, []);

  // Ticked items are things now in the kitchen, so this is the natural bridge
  // between the two screens: buy it, tick it, and it becomes pantry stock the
  // next meal plan can cook from.
  const moveCheckedToPantry = useCallback(async () => {
    const checked = items.filter((item) => item.is_checked);
    if (checked.length === 0) return 0;

    await Promise.all(
      checked.map((item) =>
        createPantryItem({
          name: item.name,
          category: item.category,
          quantity: item.quantity === null ? null : Number(item.quantity),
          unit: item.unit,
          // Left blank rather than guessed. A wrong expiry date is worse than
          // none: it drives the expiry alerts, and a fabricated one would send
          // people to throw away food that was fine.
          expires_on: null,
        })
      )
    );

    await clearCheckedItems();
    setItems((previous) => previous.filter((entry) => !entry.is_checked));
    return checked.length;
  }, [items]);

  const clearChecked = useCallback(async () => {
    const removed = await clearCheckedItems();
    setItems((previous) => previous.filter((entry) => !entry.is_checked));
    return removed;
  }, []);

  return {
    items, status, error, refresh,
    generate, generating, generateError,
    toggle, addItem, removeItem, restoreItem, clearChecked, moveCheckedToPantry,
  };
}