import type { Tier } from './entitlements.ts';
import { entitlementsFor } from './entitlements.ts';

// The arithmetic behind the pricing, in code rather than in a spreadsheet
// somebody has to remember to open. Entitlements are a business decision made
// against these numbers; when the numbers move, the test that reads them fails
// and the decision gets made again instead of quietly going stale.
//
// These are ESTIMATES, derived from the token shapes described below — not
// measurements. Real spend is recorded per call in ai_usage, and that table is
// the authority. This exists to answer one question before the fact: can the
// free tier be given away at this size without the monthly cap being hit.

// gpt-5.6-luna, matching MODEL_PRICING in openai.ts. Kept as USD because that
// is what OpenAI bills; converted once, at the bottom.
const USD_PER_MILLION_INPUT = 0.2;
const USD_PER_MILLION_OUTPUT = 1.2;
const USD_PER_GBP = 1.27;

interface TokenShape {
  input: number;
  output: number;
}

// A fourteen-meal week. Input is the profile, the pantry and the do-not-repeat
// list; output is the whole plan document including the numbers and structure.
const WEEKLY_PLAN: TokenShape = { input: 1_800, output: 3_200 };

// Three dishes from a chosen handful of ingredients: a shorter prompt and
// roughly a quarter of the output.
const PANTRY_COOK: TokenShape = { input: 1_100, output: 800 };

// Translating a stored fourteen-meal plan, in the two sizes it comes in.
//
// The first version of this translated everything and cost £0.0046 — MORE than
// the generation it translated, because output tokens dominate the bill and a
// translation reproduces the plan's entire text plus an indexed JSON envelope.
// Two changes brought it down:
//
//   'card'  — summary, waste tip and dish names only. Cooking steps are about
//             two thirds of the tokens in a plan and most are never opened, so
//             they are translated when somebody actually reads a recipe.
//   lexicon — ingredient names, over half the strings, are answered from a
//             curated table before anything reaches a model.
//
// Worst case is still the full scope, which is what the entitlement maths uses.
const PLAN_TRANSLATION_CARD: TokenShape = { input: 500, output: 700 };
const PLAN_TRANSLATION_FULL: TokenShape = { input: 2_400, output: 3_000 };

// Not built. Included because the entitlement table advertises a number, and a
// number in the pricing table should be costed even when the feature behind it
// is still a placeholder.
const VISION_SCAN: TokenShape = { input: 1_200, output: 300 };

function gbp(shape: TokenShape): number {
  const usd =
    (shape.input / 1_000_000) * USD_PER_MILLION_INPUT +
    (shape.output / 1_000_000) * USD_PER_MILLION_OUTPUT;
  return usd / USD_PER_GBP;
}

export const COST_GBP = {
  weeklyPlan: gbp(WEEKLY_PLAN),
  pantryCook: gbp(PANTRY_COOK),
  planTranslationCard: gbp(PLAN_TRANSLATION_CARD),
  planTranslationFull: gbp(PLAN_TRANSLATION_FULL),
  visionScan: gbp(VISION_SCAN),
} as const;

// The worst a single account can cost in a month: every allowance used to the
// last one. Nobody behaves like this, which is the point — the free tier has to
// survive the person who does.
export function worstCaseMonthlyCostGbp(tier: Tier): number {
  const limits = entitlementsFor(tier);

  return (
    limits.mealPlansPerMonth * COST_GBP.weeklyPlan +
    limits.pantryCooksPerMonth * COST_GBP.pantryCook +
    // The full scope, because worst case is the point: every allowance used,
    // every recipe opened.
    limits.planTranslationsPerMonth * COST_GBP.planTranslationFull +
    limits.scansPerMonth * COST_GBP.visionScan
  );
}

// ---------------------------------------------------------------------------
// Unit economics
// ---------------------------------------------------------------------------
//
// AI is the small number here, and modelling it alone was misleading enough to
// be worth stating plainly: at £0.14 a month, a Plus subscriber's AI cost is
// less than half their Stripe fee and about a twelfth of the VAT. A pricing
// decision made on AI cost alone is a pricing decision made on the least
// significant term.
//
// Three costs matter more:
//
//   Stripe     1.5% + £0.20 on a UK standard card. On £7.99 that is £0.32 —
//              over twice the AI cost, and the fixed 20p is why a yearly
//              charge is twelve times cheaper to collect than twelve monthly
//              ones.
//   VAT        20%, and UK consumer prices must be shown VAT-inclusive, so
//              once registered a sixth of the sticker price was never yours.
//              Registration is compulsory above £90,000 of taxable turnover.
//   Free tier  Every paying subscriber carries the free accounts that did not
//              convert. At one in twenty that is nineteen of them.
//
// Not tax advice, and the rates are external facts that change. They are
// written here so the assumption is visible and can be corrected, rather than
// living in a spreadsheet nobody opens.

const STRIPE_PERCENT = 0.015;
const STRIPE_FIXED_GBP = 0.20;
const VAT_RATE = 0.20;

export interface EconomicsAssumptions {
  /** Paying subscribers. Only used to spread fixed infrastructure. */
  payingUsers: number;
  /** Free accounts per paying one. 19 is a 1-in-20 conversion rate. */
  freeUsersPerPaying: number;
  /** VPS, database and domain per month, in total. */
  fixedMonthlyGbp: number;
  /** True once turnover passes the registration threshold. */
  vatRegistered: boolean;
}

export const DEFAULT_ASSUMPTIONS: EconomicsAssumptions = {
  payingUsers: 100,
  freeUsersPerPaying: 19,
  fixedMonthlyGbp: 12,
  vatRegistered: false,
};

export interface PlanEconomics {
  /** What the customer is charged, per billing period. */
  chargeGbp: number;
  /** 1 for monthly, 12 for yearly. */
  months: number;
  tier: Tier;
}

/**
 * Net profit per subscriber per month, after everything.
 *
 * Deliberately not "revenue minus AI cost". That number is flattering and
 * nearly meaningless.
 */
export function netProfitPerMonthGbp(
  plan: PlanEconomics,
  assumptions: EconomicsAssumptions = DEFAULT_ASSUMPTIONS
): number {
  const revenue = assumptions.vatRegistered
    ? plan.chargeGbp / (1 + VAT_RATE)
    : plan.chargeGbp;

  // Charged once per billing period, not once a month — which is most of why
  // a yearly plan survives a discount that a monthly one could not.
  const stripe = plan.chargeGbp * STRIPE_PERCENT + STRIPE_FIXED_GBP;

  const carriedFreeTier =
    worstCaseMonthlyCostGbp('free') * assumptions.freeUsersPerPaying;

  return (
    (revenue - stripe) / plan.months -
    worstCaseMonthlyCostGbp(plan.tier) -
    carriedFreeTier -
    assumptions.fixedMonthlyGbp / assumptions.payingUsers
  );
}

// The live prices, so the target can be asserted against what is actually
// charged rather than against numbers retyped into a test.
export const PLANS: Record<string, PlanEconomics> = {
  plusMonthly: { chargeGbp: 7.99, months: 1, tier: 'plus' },
  plusYearly: { chargeGbp: 89.99, months: 12, tier: 'plus' },
  proMonthly: { chargeGbp: 12.99, months: 1, tier: 'pro' },
  proYearly: { chargeGbp: 129.99, months: 12, tier: 'pro' },
};

// £5 for monthly. Yearly is held to £4 on purpose: twelve months of cash up
// front, no mid-year churn, and one Stripe fee instead of twelve are worth
// real money that a per-month profit figure does not capture. Both are net of
// everything above.
export const MONTHLY_TARGET_GBP = 5;
export const YEARLY_TARGET_GBP = 4;
