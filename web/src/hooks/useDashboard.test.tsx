import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchLatestMealPlan, fetchQuota } from '../lib/mealPlan';
import { fetchExpiringItems, fetchPantryItems } from '../lib/pantry';
import { fetchShoppingList } from '../lib/shoppingList';
import { useDashboard } from './useDashboard';

vi.mock('../lib/mealPlan', () => ({ fetchLatestMealPlan: vi.fn(), fetchQuota: vi.fn() }));
vi.mock('../lib/pantry', () => ({ fetchExpiringItems: vi.fn(), fetchPantryItems: vi.fn() }));
vi.mock('../lib/shoppingList', () => ({ fetchShoppingList: vi.fn() }));

beforeEach(() => {
  vi.mocked(fetchPantryItems).mockResolvedValue([]);
  vi.mocked(fetchExpiringItems).mockResolvedValue([]);
  vi.mocked(fetchShoppingList).mockResolvedValue([]);
  vi.mocked(fetchLatestMealPlan).mockResolvedValue(null);
  vi.mocked(fetchQuota).mockResolvedValue({ used: 1, limit: 3, remaining: 2 });
});

describe('useDashboard', () => {
  test('loads every dashboard source and exposes server quota', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(fetchExpiringItems).toHaveBeenCalledWith(7);
    expect(result.current.data?.quota).toEqual({ used: 1, limit: 3, remaining: 2 });
    expect(result.current.error).toBeNull();
  });

  test('can recover after one dashboard request fails', async () => {
    vi.mocked(fetchPantryItems).mockRejectedValueOnce(new Error('Network unavailable'));
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Network unavailable');

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.status).toBe('ready');
  });
});
