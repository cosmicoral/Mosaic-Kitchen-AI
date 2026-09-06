import type { PantryItem } from '../types';
import { displayUnit } from './ingredientLexicon';
import type { Locale } from '../context/LocaleContext';

// "200" + "g" -> "200g", but "2" + "pack" -> "2 pack". Symbols sit flush
// against the number, words do not.
const SYMBOL_UNITS = new Set(['g', 'kg', 'ml', 'l']);

// The unit is stored as the generating model wrote it, so a plan produced in
// Chinese fills the pantry with 克 and 个 — which then showed as "120 克" to a
// reader who had switched to English. Translated at display time, not in the
// database: the row is the user's, and a gram is a gram in either language.
// Typed on the two fields it reads rather than on PantryItem. A shopping list
// item has a quantity and a unit and no expiry date, and there is no reason
// this function should care about the difference.
export function formatAmount(
  item: { quantity: string | null; unit: string | null },
  locale: Locale = 'en'
): string {
  const unit = item.unit ? displayUnit(item.unit, locale) : null;
  if (!item.quantity) return unit ?? '';

  // NUMERIC(10,2) always comes back with trailing zeros: "200.00".
  const amount = Number(item.quantity);
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

  if (!unit) return rounded;
  return SYMBOL_UNITS.has(unit.toLowerCase())
    ? `${rounded}${unit}`
    : `${rounded} ${unit}`;
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
