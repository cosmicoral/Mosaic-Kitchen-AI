export const TIERS = ['free', 'plus', 'pro'] as const;
export type Tier = (typeof TIERS)[number];

export interface Entitlements {
  householdMembers: number;
  mealPlansPerMonth: number;
  maxMealsPerPlan: number;
  // Cooking from what is already in the kitchen gets its own, far more
  // generous allowance. It costs about a third of a weekly plan, and it is the
  // one action that directly stops food being thrown away — charging a weekly
  // plan's credit for it would be taxing the thing the product is for.
  pantryCooksPerMonth: number;
  // Reading a stored plan in the other language. Metered separately from
  // generation, and not folded into mealPlansPerMonth, because charging a plan
  // credit for reading a plan you already own would be charging twice for one
  // thing — and because a bilingual household would then get half the plans of
  // a monolingual one, which is the opposite of what this product is for.
  //
  // Costed at about 1.4x a generation, which is the surprise: output tokens
  // dominate the bill, and a translation reproduces the plan's whole text plus
  // an indexed JSON envelope. See costModel.ts.
  planTranslationsPerMonth: number;
  scansPerMonth: number;
}

// Anything not listed here is unmetered on every tier. The shopping list and
// the expiry alerts in particular make no AI calls at all — they are pure
// aggregation and date arithmetic over rows we already hold — so rationing
// them would cost a user something and save us nothing, while removing the
// two features most likely to make someone open the app daily.
const ENTITLEMENTS: Record<Tier, Entitlements> = {
  // Roughly two weekly plans a week. Counted monthly because that is the
  // period the billing runs on, and a weekly counter would reset mid-cycle.
  // Trimmed from eight plans to six when the unit economics were worked out
  // properly for the first time.
  //
  // The free tier is not free to run: at a 1-in-20 conversion rate every
  // paying subscriber carries nineteen free accounts. At eight plans that was
  // £0.86 a month per paying user — larger than the entire AI cost of serving
  // the paying user themselves, and it was not in the pricing maths at all.
  // Six plans is still more than one a week, which is the cadence the product
  // is for, and brings the carried cost to £0.65.
  free: {
    householdMembers: 1,
    mealPlansPerMonth: 6,
    maxMealsPerPlan: 7,
    pantryCooksPerMonth: 4,
    planTranslationsPerMonth: 3,
    scansPerMonth: 2,
  },
  // Not cut to pay for translation, because the arithmetic does not ask for
  // it: a Plus account using every allowance costs £0.12 of AI against £6.99
  // of revenue. Trimming that would save fractions of a penny and cost a
  // paying customer something they can feel.
  plus: {
    householdMembers: 2,
    mealPlansPerMonth: 10,
    maxMealsPerPlan: 14,
    pantryCooksPerMonth: 30,
    planTranslationsPerMonth: 20,
    scansPerMonth: 30,
  },
  // Caps bound a runaway loop or an abusive account; they are not a ration.
  // Both numbers sit far above realistic use, and a paying customer who
  // reaches one should get a conversation, not a wall.
  pro: {
    householdMembers: 6,
    mealPlansPerMonth: 30,
    maxMealsPerPlan: 21,
    pantryCooksPerMonth: 100,
    planTranslationsPerMonth: 60,
    scansPerMonth: 150,
  },
};

// Read from the environment at call time rather than captured at import time,
// so tests can set the variables without having to control module load order.
function priceTiers(): Record<string, Tier> {
  const pairs: Array<[string | undefined, Tier]> = [
    [process.env.STRIPE_PRICE_PLUS_MONTHLY, 'plus'],
    [process.env.STRIPE_PRICE_PLUS_YEARLY, 'plus'],
    [process.env.STRIPE_PRICE_PRO_MONTHLY, 'pro'],
    [process.env.STRIPE_PRICE_PRO_YEARLY, 'pro'],
  ];

  return Object.fromEntries(
    pairs.filter((pair): pair is [string, Tier] => Boolean(pair[0]))
  );
}

// 'past_due' still counts as entitled. Stripe retries a failed card for about
// two weeks, and most failures are an expired card rather than a refusal to
// pay — cutting service off on the first one turns a billing hiccup into a
// cancellation.
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

export function tierFor(status: string | null, stripePriceId: string | null): Tier {
  if (!status || !stripePriceId) return 'free';
  if (!ENTITLED_STATUSES.has(status)) return 'free';

  // An unrecognised price id resolves to 'free', which is the safe direction
  // to fail: a misconfiguration then under-serves a paying customer, who will
  // tell us, rather than silently handing everyone Pro, which nobody reports.
  return priceTiers()[stripePriceId] ?? 'free';
}

export function entitlementsFor(tier: Tier): Entitlements {
  return ENTITLEMENTS[tier];
}

export function isKnownPriceId(priceId: string): boolean {
  return priceId in priceTiers();
}

export function allowedPriceIds(): string[] {
  return Object.keys(priceTiers());
}

export type PaidTier = Exclude<Tier, 'free'>;

export interface PlanRef {
  tier: PaidTier;
  interval: 'month' | 'year';
  price_id: string;
}

// Served to the browser so the pricing page never holds its own copy of the
// price ids. Two .env files listing the same four values is a drift waiting to
// happen, and the symptom — checkout against a price that no longer exists —
// only appears at the moment someone tries to pay.
//
// Only the ids travel: the plan names, copy and feature lists stay in the
// frontend, where they can be translated.
export function configuredPlans(): PlanRef[] {
  const candidates: Array<[string | undefined, PaidTier, 'month' | 'year']> = [
    [process.env.STRIPE_PRICE_PLUS_MONTHLY, 'plus', 'month'],
    [process.env.STRIPE_PRICE_PLUS_YEARLY, 'plus', 'year'],
    [process.env.STRIPE_PRICE_PRO_MONTHLY, 'pro', 'month'],
    [process.env.STRIPE_PRICE_PRO_YEARLY, 'pro', 'year'],
  ];

  return candidates
    .filter((entry): entry is [string, PaidTier, 'month' | 'year'] => Boolean(entry[0]))
    .map(([price_id, tier, interval]) => ({ tier, interval, price_id }));
}
