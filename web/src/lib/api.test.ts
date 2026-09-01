import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiFetch } from './api';

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ok: true }),
  }));
});

describe('apiFetch locale', () => {
  test('sends the selected Chinese locale to the backend', async () => {
    window.localStorage.setItem('mosaic-kitchen-locale', 'zh');
    await apiFetch('/api/example');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/example'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Accept-Language': 'zh-CN' }),
      })
    );
  });
});
