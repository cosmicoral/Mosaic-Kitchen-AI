export const TIERS = ['free', 'plus', 'pro'] as const;
export type Tier = (typeof TIERS)[number];

export interface Entitlements {
  householdMembers: number;
  mealPlansPerMonth: number;
  // Enforced at generation, by clamping the profile's meals_per_week down to
  // this number — not validated when the profile is saved.
  //
  // Saving-time validation was the obvious place and it is the wrong one. A
  // profile is written once and read for months, so a Pro user who sets 21
  // meals and later downgrades would keep generating 21-meal plans on the free
  // tier forever, having passed the only check that ever ran. Clamping at
  // generation reads the tier at the moment the money is spent, which is the
  // only moment the answer is current.
  //
  // Clamped rather than rejected, for the same reason: the downgraded user
  // gets a seven-meal plan instead of an error telling them to go and edit a
  // setting they do not remember choosing.
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
  // Sized against an absolute budget rather than against a feeling of
  // generosity: 500 free accounts must cost under £200 a year, which is
  // £0.033 per account per month. At six plans the worst case was £0.0342 —
  // over the line, by a margin small enough that nobody would have noticed
  // until the bill arrived. These numbers land at £0.0158, about £95 a year
  // for 500 accounts, which leaves room for the cost per call to drift
  // upwards without the budget being breached.
  //
  // Two plans is the number that hurts, and it is deliberate. The free tier
  // exists to show someone that the planner understands their kitchen, not to
  // feed them indefinitely: two plans is enough to see a week of dinners that
  // respect a halal restriction and a Sichuan preference, and not enough to
  // live on. Pantry cooks are held at three rather than cut to match, because
  // they cost a third of a plan and they are the feature that stops food being
  // thrown away — the one thing worth subsidising.
  //
  // Scans are zero, not one. The vision feature does not exist yet, so any
  // number here costs nothing today and the choice looks free — which is
  // exactly why it should be zero. A 1 sitting in this table is a standing
  // instruction to start spending on the day the iOS app ships, made by
  // somebody who is not in the room. Raising it is a decision; leaving it is
  // not.
  free: {
    householdMembers: 1,
    mealPlansPerMonth: 2,
    maxMealsPerPlan: 7,
    pantryCooksPerMonth: 3,
    planTranslationsPerMonth: 2,
    scansPerMonth: 0,
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
