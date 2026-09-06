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
