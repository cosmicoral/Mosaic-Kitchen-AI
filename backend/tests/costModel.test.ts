import assert from 'node:assert/strict';
import test from 'node:test';
import { COST_GBP, worstCaseMonthlyCostGbp } from '../src/services/costModel.ts';
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

test('translation costs more than the generation it translates', () => {
  // Recorded because it is counter-intuitive and drove the free-tier cut. If a
  // future change makes this false, the quota split was decided on a premise
  // that no longer holds and should be revisited.
  assert.ok(
    COST_GBP.planTranslation > COST_GBP.weeklyPlan,
    'translation is no longer the more expensive call — revisit the free-tier quotas'
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
