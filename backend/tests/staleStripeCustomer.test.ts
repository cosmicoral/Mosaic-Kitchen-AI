import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { isMissingCustomer } from '../src/services/billingService.ts';

// Live mode refused every checkout with a 500. The Stripe error said:
//
//   code:  'resource_missing'
//   param: 'customer'
//
// The account's `users.stripe_customer_id` held a `cus_...` minted against
// test keys. Live Stripe has never heard of it, and no amount of correct
// configuration would have helped, because the broken thing was a row rather
// than a setting — the same shape as the orphaned `subscriptions` row found
// twenty minutes earlier, in a different table.
//
// That is the point worth keeping. Switching Stripe modes does not invalidate
// one reference, it invalidates every id the old mode ever minted: customers,
// prices, subscriptions. Each one is stored somewhere and each one fails
// separately, at whatever moment the code first touches it.
//
// The recovery is to forget the id and retry, so an account can heal itself
// instead of needing someone to run an UPDATE. This pins the discrimination
// that recovery depends on: Stripe reports a missing price and a missing
// subscription with the same `resource_missing` code, and clearing the
// customer in response to either would be wrong.

describe('recognising a Stripe customer that no longer exists', () => {
  test('the real error: resource_missing on the customer param', () => {
    assert.equal(
      isMissingCustomer({ code: 'resource_missing', param: 'customer' }),
      true
    );
  });

  test('a missing price is not a missing customer', () => {
    // Clearing the customer here would hide a genuine configuration error —
    // a price id from the wrong mode — behind a retry that also fails, and
    // throw away a valid customer on the way.
    assert.equal(
      isMissingCustomer({ code: 'resource_missing', param: 'price' }),
      false
    );
    assert.equal(
      isMissingCustomer({ code: 'resource_missing', param: 'line_items[0][price]' }),
      false
    );
  });

  test('a missing subscription is not a missing customer', () => {
    assert.equal(
      isMissingCustomer({ code: 'resource_missing', param: 'subscription' }),
      false
    );
  });

  test('other Stripe failures are left alone', () => {
    // Card declines, rate limits and authentication errors must all keep
    // throwing. A retry without the customer would not fix any of them.
    for (const error of [
      { code: 'card_declined', param: undefined },
      { code: 'rate_limit', param: undefined },
      { code: 'api_key_expired', param: undefined },
      { code: 'parameter_invalid_empty', param: 'customer' },
    ]) {
      assert.equal(isMissingCustomer(error), false, `${error.code} should not match`);
    }
  });

  test('non-Stripe throwables do not match', () => {
    // The catch block sees everything the try block can throw, including our
    // own errors and whatever the database raises.
    for (const value of [null, undefined, 'resource_missing', 42, new Error('boom')]) {
      assert.equal(isMissingCustomer(value), false);
    }
  });
});
