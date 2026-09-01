import type { PantryItem } from '../types';

// "200" + "g" -> "200g", but "2" + "pack" -> "2 pack". Symbols sit flush
// against the number, words do not.
const SYMBOL_UNITS = new Set(['g', 'kg', 'ml', 'l']);

export function formatAmount(item: PantryItem): string {
  if (!item.quantity) return item.unit ?? '';

  // NUMERIC(10,2) always comes back with trailing zeros: "200.00".
  const amount = Number(item.quantity);
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

  if (!item.unit) return rounded;
  return SYMBOL_UNITS.has(item.unit.toLowerCase())
    ? `${rounded}${item.unit}`
    : `${rounded} ${item.unit}`;
}

// Compares calendar days, never instants. Building both sides from Y/M/D means
// the answer cannot shift because of the clock time or the timezone offset.
export function daysUntil(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return Number.NaN;

  const target = Date.UTC(year, month - 1, day);

  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round((target - today) / 86_400_000);
}

export function formatExpiry(isoDate: string | null): string {
  if (!isoDate) return 'No expiry set';

  const days = daysUntil(isoDate);
  if (Number.isNaN(days)) return 'No expiry set';
  if (days < -1) return `Expired ${Math.abs(days)} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

export function formatExpiryForLocale(isoDate: string | null, locale: 'en' | 'zh'): string {
  if (locale === 'en') return formatExpiry(isoDate);
  if (!isoDate) return '未设置到期日期';
  const days = daysUntil(isoDate);
  if (Number.isNaN(days)) return '未设置到期日期';
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  if (days === 1) return '明天到期';
  return `${days} 天后到期`;
}

export function expiryTone(isoDate: string | null): 'red' | 'gold' | 'green' {
  if (!isoDate) return 'green';
  const days = daysUntil(isoDate);
  if (Number.isNaN(days)) return 'green';
  if (days <= 1) return 'red';
  if (days <= 4) return 'gold';
  return 'green';
}
