import { describe, expect, test, vi } from 'vitest';
import { formatExpiryForLocale } from './pantryFormat';

describe('formatExpiryForLocale', () => {
  test('renders expiry dates in Simplified Chinese', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T12:00:00Z'));
    expect(formatExpiryForLocale('2026-09-02', 'zh')).toBe('今天到期');
    expect(formatExpiryForLocale('2026-09-05', 'zh')).toBe('3 天后到期');
    expect(formatExpiryForLocale('2026-09-01', 'zh')).toBe('已过期 1 天');
    vi.useRealTimers();
  });
});
