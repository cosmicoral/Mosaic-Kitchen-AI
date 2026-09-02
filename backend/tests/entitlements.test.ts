import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  allowedPriceIds,
  entitlementsFor,
  isKnownPriceId,
  tierFor,
} from '../src/services/entitlements.ts';

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

    for (const key of ['householdMembers', 'mealPlansPerMonth', 'maxMealsPerPlan', 'scansPerMonth'] as const) {
      assert.ok(plus[key] > free[key], `plus.${key} should exceed free.${key}`);
      assert.ok(pro[key] > plus[key], `pro.${key} should exceed plus.${key}`);
    }
  });

  test('the free tier is usable rather than a token', () => {
    const free = entitlementsFor('free');
    // A free tier nobody can form a habit on converts nobody. These are the
    // floors the pricing model was built on.
    assert.ok(free.mealPlansPerMonth >= 2);
    assert.ok(free.scansPerMonth >= 3);
  });

  test('free is limited to a single household member', () => {
    // The paywall is the household, not the button. This is the assertion that
    // fails if someone quietly widens the free tier past its upgrade trigger.
    assert.equal(entitlementsFor('free').householdMembers, 1);
  });
});
