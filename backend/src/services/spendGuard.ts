import * as aiUsageRepository from '../repositories/aiUsageRepository.ts';
import { AppError } from '../types/index.ts';

// Per-user quotas bound what one person can spend. This bounds what everyone
// can spend together, which is a different failure: a thousand free accounts
// each staying politely inside their allowance still add up, and so does a
// prompt that quietly doubles in length after a change nobody costed.
//
// Expressed in pounds because that is the unit the decision is made in, and
// converted at call time — ai_usage stores USD because that is what OpenAI
// bills in.
const DEFAULT_CAP_GBP = 100;
const USD_PER_GBP = 1.27;

// Recomputed at most once a minute. The sum is over one month of one table
// with an index on created_at, but it would otherwise run on every free-tier
// generation, and being sixty seconds stale cannot matter for a ceiling
// measured in tens of pounds.
const CACHE_TTL_MS = 60_000;

let cachedTotalUsd: number | null = null;
let cachedAt = 0;

function capGbp(): number {
  const configured = Number(process.env.FREE_TIER_MONTHLY_SPEND_CAP_GBP);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CAP_GBP;
}

export async function monthlySpendGbp(): Promise<number> {
  const now = Date.now();

  if (cachedTotalUsd === null || now - cachedAt > CACHE_TTL_MS) {
    cachedTotalUsd = await aiUsageRepository.totalCostUsdThisMonth();
    cachedAt = now;
  }

  return cachedTotalUsd / USD_PER_GBP;
}

// Only free accounts are turned away. A paying subscriber is revenue-positive
// by a wide margin at any plausible usage, so cutting them off to protect a
// budget would cost more than it saved — and they are the people who would
// ask for a refund.
export async function assertFreeTierSpendAvailable(): Promise<void> {
  const spent = await monthlySpendGbp();
  if (spent < capGbp()) return;

  console.error(
    `Free-tier AI spend cap reached: £${spent.toFixed(2)} of £${capGbp().toFixed(2)} this month`
  );

  throw new AppError(
    'Free plans are paused for the rest of the month while we catch up with demand. Paid plans are unaffected.',
    'QUOTA_EXCEEDED'
  );
}

// Tests seed usage rows directly and need the next read to see them.
export function clearCache(): void {
  cachedTotalUsd = null;
  cachedAt = 0;
}
