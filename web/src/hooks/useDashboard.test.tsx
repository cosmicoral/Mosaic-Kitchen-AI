import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { LocaleProvider } from '../context/LocaleContext';
import { fetchLatestMealPlan, fetchQuota } from '../lib/mealPlan';
import { fetchExpiringItems, fetchPantryItems } from '../lib/pantry';
import { fetchShoppingList } from '../lib/shoppingList';
import { useDashboard } from './useDashboard';

// useDashboard reads the locale so it can refetch when the language changes —
// added when a stored plan could be in either language — which makes the
// provider a hard requirement rather than presentation. Rendering the hook
// bare throws "useLocale must be used inside LocaleProvider", which is the
// context doing its job: a hook that silently defaulted to English here would
// have passed this test and refetched the wrong language in the browser.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LocaleProvider>{children}</LocaleProvider>
);

vi.mock('../lib/mealPlan', () => ({ fetchLatestMealPlan: vi.fn(), fetchQuota: vi.fn() }));
vi.mock('../lib/pantry', () => ({ fetchExpiringItems: vi.fn(), fetchPantryItems: vi.fn() }));
vi.mock('../lib/shoppingList', () => ({ fetchShoppingList: vi.fn() }));

beforeEach(() => {
  vi.mocked(fetchPantryItems).mockResolvedValue([]);
  vi.mocked(fetchExpiringItems).mockResolvedValue([]);
  vi.mocked(fetchShoppingList).mockResolvedValue([]);
  vi.mocked(fetchLatestMealPlan).mockResolvedValue(null);
  vi.mocked(fetchQuota).mockResolvedValue({ tier: 'free', used: 1, limit: 3, remaining: 2 });
});

afterEach(cleanup);

describe('useDashboard', () => {
  test('loads every dashboard source and exposes server quota', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(fetchExpiringItems).toHaveBeenCalledWith(7);
    // The tier travels with the quota. It was added so the dashboard could
    // tell "you are out until next month" from an upgrade prompt without a
    // second request, and this expectation had not caught up — the assertion
    // was failing on a field it should have been checking.
    expect(result.current.data?.quota).toEqual({
      tier: 'free',
      used: 1,
      limit: 3,
      remaining: 2,
    });
    expect(result.current.error).toBeNull();
  });

  test('can recover after one dashboard request fails', async () => {
    vi.mocked(fetchPantryItems).mockRejectedValueOnce(new Error('Network unavailable'));
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Network unavailable');

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.status).toBe('ready');
  });
});
