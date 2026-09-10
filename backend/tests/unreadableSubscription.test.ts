import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  isUnreadableSubscription,
  tierFor,
} from '../src/services/entitlements.ts';

// Switching Stripe from test mode to live left one row in `subscriptions`
// holding a test-mode price id. The live price allowlist does not contain it,
// and two functions then answered the same question differently:
//
//   getStatus            → tierFor(...) → unknown price → 'free'
//   createCheckoutSession → findActiveByUser(...) → a row exists → refuse
//
// So the subscription page said "Free · Active · Renews 4 October 2026" —
// three claims from one row that cannot all be true — and the pricing page
// answered an upgrade with "You already have a subscription". Neither message
// was wrong about its own half. Together they were unusable: the customer was
// sent to look for a subscription the interface had just denied having.
//
// The bug was never that entitlements fell back to free. That direction is
// correct and deliberate — under-serving a paying customer gets reported,
// over-serving everyone does not. The bug was that "this account is free" and
// "I cannot read this account's subscription" were returned as the same
// answer, leaving the interface no way to tell them apart.

const KNOWN = 'price_known_plus_monthly';

function withPrices<T>(run: () => T): T {
  const before = process.env.STRIPE_PRICE_PLUS_MONTHLY;
  process.env.STRIPE_PRICE_PLUS_MONTHLY = KNOWN;
  try {
    return run();
  } finally {
    if (before === undefined) delete process.env.STRIPE_PRICE_PLUS_MONTHLY;
    else process.env.STRIPE_PRICE_PLUS_MONTHLY = before;
  }
}

describe('an unreadable subscription is distinguishable from a free account', () => {
  test('the real case: an entitled row naming a price we do not know', () => {
    withPrices(() => {
      // Exactly the production row: status 'active', price id from the other
      // Stripe mode.
      const status = 'active';
      const price = 'price_1UBoGsIGmZDo3nh94gtOEpha';

      assert.equal(
        tierFor(status, price),
        'free',
        'entitlements must still fail closed — this half was never wrong'
      );
      assert.equal(
        isUnreadableSubscription(status, price),
        true,
        'the account holds something we cannot interpret, and nothing said so'
      );
    });
  });

  test('an account with no subscription at all is not unreadable', () => {
    withPrices(() => {
      // The distinction the whole change rests on. Genuinely free accounts are
      // the overwhelming majority; if they tripped this flag every one of them
      // would be shown an error about a subscription they never had.
      assert.equal(isUnreadableSubscription(null, null), false);
      assert.equal(isUnreadableSubscription('active', null), false);
      assert.equal(isUnreadableSubscription(null, KNOWN), false);
    });
  });

  test('a cancelled row naming an unknown price is not unreadable either', () => {
    withPrices(() => {
      // It is over. There is nothing to interpret and nothing to warn about,
      // and flagging it would put a support message on the screen of everyone
      // who has ever cancelled.
      for (const status of ['canceled', 'unpaid', 'incomplete']) {
        assert.equal(
          isUnreadableSubscription(status, 'price_from_another_mode'),
          false,
          `${status} should not count as unreadable`
        );
      }
    });
  });

  test('a working subscription is readable', () => {
    withPrices(() => {
      assert.equal(isUnreadableSubscription('active', KNOWN), false);
      assert.equal(tierFor('active', KNOWN), 'plus');
    });
  });

  test('past_due counts as entitled, so an unknown price there is unreadable', () => {
    withPrices(() => {
      // past_due is deliberately treated as entitled elsewhere — Stripe retries
      // a failed card for about two weeks. The same row with an unresolvable
      // price is the same problem, and must not slip through because of the
      // status.
      assert.equal(isUnreadableSubscription('past_due', 'price_other_mode'), true);
    });
  });
});

describe('the flag and the tier cannot drift apart', () => {
  test('unreadable always implies the free tier', () => {
    withPrices(() => {
      // If a future change ever makes an unreadable row resolve to a paid tier,
      // that is a row we admitted we could not read being billed for anyway.
      const cases: Array<[string, string]> = [
        ['active', 'price_unknown_a'],
        ['trialing', 'price_unknown_b'],
        ['past_due', 'price_unknown_c'],
      ];

      for (const [status, price] of cases) {
        if (isUnreadableSubscription(status, price)) {
          assert.equal(
            tierFor(status, price),
            'free',
            `${status}/${price} was flagged unreadable but resolved to a paid tier`
          );
        }
      }
    });
  });
});
