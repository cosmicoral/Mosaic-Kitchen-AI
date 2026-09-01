import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchExpiringItems } from '../lib/pantry';
import { useExpiringItems } from './useExpiringItems';

vi.mock('../lib/pantry', () => ({ fetchExpiringItems: vi.fn() }));

beforeEach(() => {
  vi.mocked(fetchExpiringItems).mockResolvedValue([]);
});

describe('useExpiringItems', () => {
  test('passes the requested window to the expiry API', async () => {
    const { result } = renderHook(() => useExpiringItems(14));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchExpiringItems).toHaveBeenCalledWith(14);
  });

  test('surfaces query failures for the retry UI', async () => {
    vi.mocked(fetchExpiringItems).mockRejectedValueOnce(new Error('Expiry API unavailable'));
    const { result } = renderHook(() => useExpiringItems());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Expiry API unavailable');
  });
});
