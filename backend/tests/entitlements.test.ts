import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  allowedPriceIds,
  entitlementsFor,
  isKnownPriceId,
  tierFor,
} from '../src/services/entitlements.ts';
import { worstCaseMonthlyCostGbp } from '../src/services/costModel.ts';

// The business constraint the free tier is sized against, written down once so
// the assertions below are checking a stated decision rather than each other.
// Not in costModel: that module answers "what does this cost", and this is
// "what are we willing to spend", which is a different kind of fact and one
// that changes for reasons that have nothing to do with token prices.
const FREE_USERS_PLANNED_FOR = 500;
const FREE_TIER_ANNUAL_BUDGET_GBP = 200;

const PRICE_ENV_KEYS = [
  'STRIPE_PRICE_PLUS_MONTHLY',
  'STRIPE_PRICE_PLUS_YEARLY',
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_PRO_YEARLY',
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(PRICE_ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.STRIPE_PRICE_PLUS_MONTHLY = 'price_plus_m';
  process.env.STRIPE_PRICE_PLUS_YEARLY = 'price_plus_y';
  process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_m';
  process.env.STRIPE_PRICE_PRO_YEARLY = 'price_pro_y';
});

afterEach(() => {
  for (const key of PRICE_ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('tierFor', () => {
  test('maps each price id to its tier', () => {
    assert.equal(tierFor('active', 'price_plus_m'), 'plus');
    assert.equal(tierFor('active', 'price_plus_y'), 'plus');
    assert.equal(tierFor('active', 'price_pro_m'), 'pro');
    assert.equal(tierFor('active', 'price_pro_y'), 'pro');
  });

  test('treats no subscription as free', () => {
    assert.equal(tierFor(null, null), 'free');
    assert.equal(tierFor('active', null), 'free');
    assert.equal(tierFor(null, 'price_pro_m'), 'free');
  });

  test('keeps a past_due subscriber entitled', () => {
    // Stripe retries a failed card for about two weeks and most failures are
    // an expired card. Cutting service off on the first one turns a billing
    // hiccup into a cancellation.
    assert.equal(tierFor('past_due', 'price_pro_m'), 'pro');
  });

  test('entitles trialing subscribers', () => {
    assert.equal(tierFor('trialing', 'price_plus_m'), 'plus');
  });

  test('drops cancelled, unpaid and incomplete subscriptions to free', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused']) {
      assert.equal(tierFor(status, 'price_pro_y'), 'free', `${status} should not be entitled`);
    }
  });

  test('falls back to free for an unrecognised price id', () => {
    // The safe direction to fail. A misconfiguration then under-serves a
    // paying customer, who complains, rather than handing everyone Pro, which
    // nobody reports.
    assert.equal(tierFor('active', 'price_from_another_account'), 'free');
  });

  test('falls back to free when the environment is not configured', () => {
    for (const key of PRICE_ENV_KEYS) delete process.env[key];
    assert.equal(tierFor('active', 'price_plus_m'), 'free');
  });
});

describe('isKnownPriceId', () => {
  test('accepts only the four configured prices', () => {
    assert.equal(isKnownPriceId('price_plus_m'), true);
    assert.equal(isKnownPriceId('price_pro_y'), true);
    // The price id arrives from the browser, so this is what stops someone
    // checking out against a 1p price of their own choosing.
    assert.equal(isKnownPriceId('price_someone_elses'), false);
    assert.equal(isKnownPriceId(''), false);
  });

  test('lists exactly the configured ids', () => {
    assert.deepEqual(allowedPriceIds().sort(), [
      'price_plus_m',
      'price_plus_y',
      'price_pro_m',
      'price_pro_y',
    ]);
  });
});

describe('entitlementsFor', () => {
  test('each tier is strictly more generous than the one below', () => {
    const free = entitlementsFor('free');
    const plus = entitlementsFor('plus');
    const pro = entitlementsFor('pro');

    for (const key of [
      'householdMembers',
      'mealPlansPerMonth',
      'maxMealsPerPlan',
      'pantryCooksPerMonth',
      'scansPerMonth',
    ] as const) {
      assert.ok(plus[key] > free[key], `plus.${key} should exceed free.${key}`);
      assert.ok(pro[key] > plus[key], `pro.${key} should exceed plus.${key}`);
    }
  });

  test('the free tier is usable rather than a token', () => {
    const free = entitlementsFor('free');

    // This test previously asserted four plans a month, on the reasoning that
    // somebody has to be able to plan a week, every week, or they never form
    // the habit that makes them consider paying. That was a real argument and
    // it lost to a larger one: six plans put 500 free accounts at £205 a year
    // against a £200 budget, so the tier as written was a promise that could
    // not be kept. A free tier that is generous and unaffordable is not
    // generous, it is temporary.
    //
    // What replaced the habit argument is a trial argument: two plans is
    // enough to see a week of dinners that respect a halal restriction and a
    // Sichuan preference, which is the thing somebody is actually evaluating.
    // Recording the change here rather than editing 4 down to 2, because the
    // number is the conclusion and the reason is the part worth keeping.
    assert.ok(
      free.mealPlansPerMonth >= 2,
      `${free.mealPlansPerMonth} plans is not enough to judge the product by`
    );
    assert.ok(free.maxMealsPerPlan >= 7, 'a plan should cover at least a week of dinners');
    assert.ok(free.pantryCooksPerMonth > 0);
    assert.ok(free.planTranslationsPerMonth > 0);
  });

  test('the free tier fits the budget it is given, at the size it is planned for', () => {
    // The constraint in the business's own terms: 500 free accounts, every one
    // of them at their ceiling, for under £200 a year.
    //
    // The earlier version of this test hard-coded its own unit costs — half a
    // penny a plan, a fifth of that a pantry cook — which meant the entitlement
    // table was being checked against numbers retyped next to it rather than
    // against the cost model. The two could drift apart silently, and a longer
    // prompt would have made the model more expensive while leaving this test
    // green. It reads costModel now, so a prompt change moves both.
    const perUserMonthly = worstCaseMonthlyCostGbp('free');
    const yearlyFor500 = perUserMonthly * FREE_USERS_PLANNED_FOR * 12;

    assert.ok(
      yearlyFor500 <= FREE_TIER_ANNUAL_BUDGET_GBP,
      `${FREE_USERS_PLANNED_FOR} free users at their limits would cost ` +
        `£${yearlyFor500.toFixed(0)}/year against a £${FREE_TIER_ANNUAL_BUDGET_GBP} budget ` +
        `(£${perUserMonthly.toFixed(4)} each per month)`
    );
  });

  test('the free tier is not merely scraping the budget', () => {
    // Passing at £199 would be arithmetically true and operationally useless:
    // the unit costs here are estimates from token shapes, not measurements,
    // and a real prompt that comes in 20% heavier than modelled should not put
    // the business over. Asserting a third of the budget in headroom is what
    // makes the difference between a number that has been checked and a number
    // that has been chosen.
    const yearlyFor500 =
      worstCaseMonthlyCostGbp('free') * FREE_USERS_PLANNED_FOR * 12;

    assert.ok(
      yearlyFor500 <= FREE_TIER_ANNUAL_BUDGET_GBP * 0.67,
      `£${yearlyFor500.toFixed(0)}/year leaves too little room for the cost estimates to be wrong`
    );
  });

  test('a free plan cannot be made bigger than the tier allows', () => {
    // maxMealsPerPlan was advertised on the pricing page and enforced nowhere:
    // meals_per_week was validated only against a global maximum of 21, so a
    // free account could set 21 in the profile editor and triple the token
    // cost of every plan it generated. Every number above assumes the
    // advertised shape, so this is the assertion that the shape is real.
    const source = readFileSync(
      join(import.meta.dirname, '..', 'src', 'services', 'mealPlanService.ts'),
      'utf8'
    );

    assert.match(
      source,
      /capMealsToTier\(\s*rawProfile,\s*limits\.maxMealsPerPlan\s*\)/,
      'generate() no longer clamps the profile to the tier meal cap'
    );
    assert.ok(
      !/buildMealPlanPrompt\(\s*rawProfile/.test(source),
      'the prompt is being built from the unclamped profile'
    );
  });

  test('free is limited to a single household member', () => {
    // The paywall is the household, not the button. This is the assertion that
    // fails if someone quietly widens the free tier past its upgrade trigger.
    assert.equal(entitlementsFor('free').householdMembers, 1);
  });
});
