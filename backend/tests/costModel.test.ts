import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COST_GBP,
  DEFAULT_ASSUMPTIONS,
  MONTHLY_TARGET_GBP,
  PLANS,
  YEARLY_TARGET_GBP,
  netProfitPerMonthGbp,
  worstCaseMonthlyCostGbp,
  type PlanEconomics,
} from '../src/services/costModel.ts';
import { TIERS, entitlementsFor } from '../src/services/entitlements.ts';

// The free tier is a promise made with somebody else's money. These tests are
// the thing that stops that promise quietly outgrowing the budget when a quota
// is nudged up or a prompt gets longer.

// FREE_TIER_MONTHLY_SPEND_CAP_GBP defaults to this in spendGuard.
const CAP_GBP = 100;
const TARGET_FREE_USERS = 1_000;

test('a thousand free users, all maxed out, stay under the monthly cap', () => {
  const perUser = worstCaseMonthlyCostGbp('free');
  const total = perUser * TARGET_FREE_USERS;

  assert.ok(
    total < CAP_GBP,
    `1,000 free users would cost £${total.toFixed(0)}/month against a £${CAP_GBP} cap ` +
      `(£${perUser.toFixed(4)} each). Lower a free-tier quota or raise the cap deliberately.`
  );
});

test('the free tier keeps meaningful headroom, not just a passing margin', () => {
  // Passing at 999 users would be technically true and useless. This asserts
  // the ceiling is a long way off, so growth is a business decision rather
  // than an outage.
  const usersAtCap = CAP_GBP / worstCaseMonthlyCostGbp('free');

  assert.ok(
    usersAtCap > 2_000,
    `the cap would be reached at ${Math.floor(usersAtCap)} free users, which is too little runway`
  );
});

test('translating a plan is cheaper than generating one', () => {
  // The earlier version of this test asserted the opposite, because it was
  // true: a full translation cost 1.4x a generation, and that is what took the
  // free tier from eight plans to six. Lazy scoping and the ingredient lexicon
  // changed the premise, the test failed, and the quota was decided again —
  // which is the entire reason it was written down as an assertion rather than
  // left in a comment.
  assert.ok(
    COST_GBP.planTranslationFull < COST_GBP.weeklyPlan,
    'a full translation costs more than a generation again — revisit the free-tier quotas'
  );
});

test('the card scope is a small fraction of the full one', () => {
  // The saving that makes browsing in the other language nearly free. If this
  // narrows, the card tier has started carrying cooking steps and the split
  // has stopped doing its job.
  assert.ok(
    COST_GBP.planTranslationCard < COST_GBP.planTranslationFull * 0.3,
    `card translation is £${COST_GBP.planTranslationCard.toFixed(5)} against a full ` +
      `£${COST_GBP.planTranslationFull.toFixed(5)} — the lazy split is not saving much`
  );
});

test('every paid tier costs a small fraction of its own revenue', () => {
  const monthlyRevenue = { plus: 6.99, pro: 11.99 } as const;

  for (const [tier, revenue] of Object.entries(monthlyRevenue) as Array<
    ['plus' | 'pro', number]
  >) {
    const cost = worstCaseMonthlyCostGbp(tier);
    assert.ok(
      cost < revenue * 0.15,
      `${tier} costs £${cost.toFixed(2)} of AI against £${revenue} of revenue — ` +
        'over 15%, so the price or the allowances need revisiting'
    );
  }
});

test('every tier has a translation allowance', () => {
  // A tier added without one would silently get undefined, and `used >=
  // undefined` is false, which means unlimited translation rather than none.
  // That is the wrong direction to fail in.
  for (const tier of TIERS) {
    const limit = entitlementsFor(tier).planTranslationsPerMonth;
    assert.equal(typeof limit, 'number', `${tier} has no translation allowance`);
    assert.ok(limit > 0, `${tier} has a non-positive translation allowance`);
  }
});

test('allowances increase with tier', () => {
  const free = entitlementsFor('free');
  const plus = entitlementsFor('plus');
  const pro = entitlementsFor('pro');

  for (const key of [
    'mealPlansPerMonth',
    'pantryCooksPerMonth',
    'planTranslationsPerMonth',
    'scansPerMonth',
  ] as const) {
    assert.ok(plus[key] > free[key], `plus.${key} is not above free`);
    assert.ok(pro[key] > plus[key], `pro.${key} is not above plus`);
  }
});

// --- Unit economics --------------------------------------------------------
//
// The £5 target was previously checked against AI cost alone, which passed
// comfortably and meant almost nothing: Stripe and VAT are each larger than
// the AI bill, and neither was in the calculation. These assert the target
// against everything.

test('every plan clears its net profit target, before VAT registration', () => {
  for (const [name, plan] of Object.entries(PLANS)) {
    const target = plan.months === 12 ? YEARLY_TARGET_GBP : MONTHLY_TARGET_GBP;
    const net = netProfitPerMonthGbp(plan);

    assert.ok(
      net >= target,
      `${name} nets £${net.toFixed(2)}/month against a £${target} target`
    );
  }
});

test('every plan still clears its target once VAT registration bites', () => {
  // Compulsory above £90,000 turnover, and a sixth of the sticker price stops
  // being yours overnight. A price that only works below the threshold is a
  // price that breaks on the day the business starts going well.
  const vat = { ...DEFAULT_ASSUMPTIONS, vatRegistered: true };

  for (const [name, plan] of Object.entries(PLANS)) {
    const target = plan.months === 12 ? YEARLY_TARGET_GBP : MONTHLY_TARGET_GBP;
    const net = netProfitPerMonthGbp(plan, vat);

    assert.ok(
      net >= target,
      `${name} nets £${net.toFixed(2)}/month VAT-registered, against £${target}`
    );
  }
});

test('the targets survive a poor conversion rate', () => {
  // One in fifty rather than one in twenty. Free-tier cost is the term that
  // grows when growth is going badly, which is exactly when the margin is
  // needed.
  const poor = { ...DEFAULT_ASSUMPTIONS, freeUsersPerPaying: 49, vatRegistered: true };

  for (const [name, plan] of Object.entries(PLANS)) {
    const net = netProfitPerMonthGbp(plan, poor);
    assert.ok(
      net > 0,
      `${name} loses £${Math.abs(net).toFixed(2)}/month at a 1-in-50 conversion rate`
    );
  }
});

test('the first handful of subscribers are not loss-making', () => {
  // Fixed infrastructure spread over ten people rather than a hundred. If the
  // first ten customers cost money, the plan needs a bigger cushion or cheaper
  // hosting — and it is better to know that before the VPS is bought.
  const tiny = { ...DEFAULT_ASSUMPTIONS, payingUsers: 10 };

  for (const [name, plan] of Object.entries(PLANS)) {
    const net = netProfitPerMonthGbp(plan, tiny);
    assert.ok(net > 0, `${name} loses money at ten subscribers: £${net.toFixed(2)}`);
  }
});

test('a yearly plan is a real discount on its monthly equivalent', () => {
  // Otherwise the tier exists only on the pricing page. Anything under about
  // 10% and nobody prepays a year for it.
  const pairs: Array<[PlanEconomics, PlanEconomics]> = [
    [PLANS.plusYearly!, PLANS.plusMonthly!],
    [PLANS.proYearly!, PLANS.proMonthly!],
  ];

  for (const [yearly, monthly] of pairs) {
    const discount = 1 - yearly.chargeGbp / 12 / monthly.chargeGbp;
    assert.ok(
      discount > 0.05,
      `a ${(discount * 100).toFixed(0)}% yearly discount is not worth prepaying for`
    );
  }
});
