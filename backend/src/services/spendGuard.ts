import * as aiUsageRepository from '../repositories/aiUsageRepository.ts';
import { AppError } from '../types/index.ts';
import { bandFor, classifySpend, type SpendBand } from '../config/aiBudget.ts';
import type { Tier } from './entitlements.ts';

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
// Warn at four fifths, so the first you hear of this is a log line rather
// than a user telling you they cannot generate anything. Logged on the way
// past rather than on a schedule, because the only moment it matters is when
// somebody is about to be turned away.
const WARN_AT = 0.8;

export async function assertFreeTierSpendAvailable(): Promise<void> {
  const spent = await monthlySpendGbp();
  const cap = capGbp();
  const ratio = spent / cap;

  if (ratio >= WARN_AT && ratio < 1) {
    console.warn(
      `Free-tier AI spend at ${(ratio * 100).toFixed(0)}% of the monthly cap ` +
        `(£${spent.toFixed(2)} of £${cap.toFixed(2)})`
    );
  }

  if (spent < cap) return;

  console.error(
    `Free-tier AI spend cap reached: £${spent.toFixed(2)} of £${capGbp().toFixed(2)} this month`
  );

  throw new AppError(
    'Free plans are paused for the rest of the month while we catch up with demand. Paid plans are unaffected.',
    'QUOTA_EXCEEDED'
  );
}

// ---------------------------------------------------------------------------
// The same question at the scale of one account
// ---------------------------------------------------------------------------
//
// Quotas count requests; this measures money. They are not the same bound, and
// the gap between them is where the surprises live: two accounts can sit
// inside identical allowances and differ several-fold in what they cost,
// because a plan for six people with a full pantry and a retry is not the same
// call as a plan for one person. The request count is what the user sees and
// what the pricing page promises. This is the backstop underneath it.
//
// Not cached. The global total is one sum over the whole table and is read on
// every free generation, which is why it is worth sixty seconds of staleness;
// this one is a single indexed lookup by user_id, and caching it per user
// would mean either a map that grows without bound or a cache that misses
// almost every time.
export async function userSpendBand(userId: string, tier: Tier): Promise<SpendBand> {
  const spentGbp = (await aiUsageRepository.costUsdThisMonthForUser(userId)) / USD_PER_GBP;
  const band = bandFor(tier === 'free');
  const verdict = classifySpend(spentGbp, band);

  // Logged, not surfaced. The user's side of this is a plan built from a
  // slightly shorter prompt, which they cannot tell from any other plan; our
  // side is a line saying which account to look at if the bill moves.
  if (verdict !== 'normal') {
    console.warn(
      `User ${userId} (${tier}) is ${verdict}: £${spentGbp.toFixed(4)} of AI this month ` +
        `(soft £${band.softCapGbp}, hard £${band.hardCapGbp})`
    );
  }

  return verdict;
}

/**
 * Throws when the account is past its hard ceiling.
 *
 * The message says nothing about pounds, tokens or thresholds. A cost ceiling
 * is our problem, and a user told they have "used £0.05 of AI" learns nothing
 * they can act on while learning something about our margins that is none of
 * a stranger's business. What they get is the same thing they would get from
 * any other exhausted allowance, because from where they are standing that is
 * what it is.
 */
export function assertNotBlocked(verdict: SpendBand, tier: Tier): void {
  if (verdict !== 'blocked') return;

  throw new AppError(
    tier === 'free'
      ? 'You have reached this month’s limit on your free plan.'
      : 'This account has hit an unusually high level of activity this month. Get in touch and we will sort it out.',
    'QUOTA_EXCEEDED'
  );
}

// Tests seed usage rows directly and need the next read to see them.
export function clearCache(): void {
  cachedTotalUsd = null;
  cachedAt = 0;
}
