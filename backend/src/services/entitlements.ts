export const TIERS = ['free', 'plus', 'pro'] as const;
export type Tier = (typeof TIERS)[number];

export interface Entitlements {
  householdMembers: number;
  mealPlansPerMonth: number;
  maxMealsPerPlan: number;
  scansPerMonth: number;
}

// Anything not listed here is unmetered on every tier. The shopping list and
// the expiry alerts in particular make no AI calls at all — they are pure
// aggregation and date arithmetic over rows we already hold — so rationing
// them would cost a user something and save us nothing, while removing the
// two features most likely to make someone open the app daily.
const ENTITLEMENTS: Record<Tier, Entitlements> = {
  free: { householdMembers: 1, mealPlansPerMonth: 2, maxMealsPerPlan: 7, scansPerMonth: 3 },
  plus: { householdMembers: 2, mealPlansPerMonth: 10, maxMealsPerPlan: 14, scansPerMonth: 30 },
  // Caps bound a runaway loop or an abusive account; they are not a ration.
  // Both numbers sit far above realistic use, and a paying customer who
  // reaches one should get a conversation, not a wall.
  pro: { householdMembers: 6, mealPlansPerMonth: 30, maxMealsPerPlan: 21, scansPerMonth: 150 },
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
