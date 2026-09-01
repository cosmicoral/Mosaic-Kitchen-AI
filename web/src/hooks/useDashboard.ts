import { useCallback, useEffect, useState } from 'react';
import { fetchLatestMealPlan, fetchQuota } from '../lib/mealPlan';
import { fetchExpiringItems, fetchPantryItems } from '../lib/pantry';
import { fetchShoppingList } from '../lib/shoppingList';
import type { MealPlanQuota, MealPlanRecord, PantryItem, ShoppingListItem } from '../types';

export interface DashboardData {
  pantryItems: PantryItem[];
  expiringItems: PantryItem[];
  shoppingItems: ShoppingListItem[];
  latestPlan: MealPlanRecord | null;
  quota: MealPlanQuota;
}

type DashboardStatus = 'loading' | 'ready' | 'error';

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [pantryItems, expiringItems, shoppingItems, latestPlan, quota] =
        await Promise.all([
          fetchPantryItems(),
          fetchExpiringItems(7),
          fetchShoppingList(),
          fetchLatestMealPlan(),
          fetchQuota(),
        ]);
      setData({ pantryItems, expiringItems, shoppingItems, latestPlan, quota });
      setStatus('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your dashboard');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, status, error, refresh };
}
