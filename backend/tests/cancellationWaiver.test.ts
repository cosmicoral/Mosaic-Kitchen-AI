import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { WAIVER_VERSION, createCheckoutSession } from '../src/services/billingService.ts';
import { AppError } from '../src/types/index.ts';

// The Consumer Contracts (Information, Cancellation and Additional Charges)
// Regulations 2013 give a UK consumer 14 days to cancel a digital service. The
// right survives unless the customer expressly asked for immediate performance
// AND acknowledged that asking costs them the right — both halves, before the
// service starts.
//
// This application activates a plan the moment Stripe's webhook lands. There
// is no delayed-start path, so every subscription is performed inside the
// cancellation period, and the acknowledgement is the only thing standing
// between a charge and a refund we would have to honour.
//
// None of that fails loudly. A checkout that skips the checkbox looks exactly
// like one that did not, right up until someone asks for their money back and
// we have nothing to show. So it is pinned here.

const root = join(import.meta.dirname, '..');
const web = join(root, '..', 'web', 'src');

function read(...parts: string[]): string {
  return readFileSync(join(...parts), 'utf8');
}

describe('the waiver version is one fact, not two', () => {
  // WAIVER_VERSION exists in backend/src/services/billingService.ts and in
  // web/src/content/waiver.ts, because the backend cannot import from the
  // frontend bundle. Four separate bugs in this codebase have come from one
  // fact kept by hand in more than one file. This is the copy that notices.
  test('backend and frontend agree on which wording was shown', () => {
    const source = read(web, 'content', 'waiver.ts');
    const match = /export const WAIVER_VERSION = '([^']+)'/.exec(source);

    assert.ok(match, 'WAIVER_VERSION was not found in web/src/content/waiver.ts');
    assert.equal(
      match[1],
      WAIVER_VERSION,
      'The waiver version differs between the frontend and the backend. Every ' +
        'acknowledgement recorded from now on would claim the customer agreed ' +
        'to wording they were never shown.'
    );
  });

  test('the wording still contains both halves the Regulations require', () => {
    const source = read(web, 'content', 'waiver.ts');

    // Deliberately checked as substance rather than as an exact string: the
    // sentence should be editable, and what must not be edited away is either
    // half of it. English only — the Chinese is checked below by structure,
    // because asserting on a translation's phrasing pins the translator's
    // choices rather than the meaning.
    const english = source.slice(source.indexOf('en: {'), source.indexOf('zh: {'));

    assert.match(
      english,
      /start my subscription straight away/i,
      'The express request for immediate performance has gone from the waiver. ' +
        'Without it the customer never asked, and the 14-day right survives.'
    );
    assert.match(
      english,
      /give up my right to cancel within 14 days/i,
      'The acknowledgement of losing the right has gone from the waiver. ' +
        'A request to start early, on its own, waives nothing.'
    );
  });

  test('both languages carry the same three pieces', () => {
    const source = read(web, 'content', 'waiver.ts');

    for (const key of ['label', 'detail', 'required']) {
      const occurrences = source.match(new RegExp(`^\\s*${key}:`, 'gm')) ?? [];
      assert.equal(
        occurrences.length,
        2,
        `waiverText has ${occurrences.length} '${key}' entries, expected one per ` +
          'language. A customer reading the language that is missing one would be ' +
          'shown a blank where the acknowledgement should be.'
      );
    }
  });
});

describe('checkout refuses to start without the acknowledgement', () => {
  // Reverse-verified: with the guard removed from createCheckoutSession, each
  // of these reaches the Stripe call and fails on a missing API key instead of
  // on WAIVER_REQUIRED.
  const REFUSED = [
    ['omitted entirely', undefined],
    ['explicitly declined', false],
    // The string "false" is truthy. A `Boolean(...)` in the controller would
    // read this as consent, which is exactly the accident worth pinning.
    ['sent as the string "false"', 'false' as unknown as boolean],
    ['sent as 1 rather than true', 1 as unknown as boolean],
  ] as const;

  for (const [label, value] of REFUSED) {
    test(`refuses when the waiver is ${label}`, async () => {
      await assert.rejects(
        () =>
          createCheckoutSession('user-1', 'someone@example.com', {
            priceId: process.env.STRIPE_PRICE_PLUS_MONTHLY ?? 'price_test_plus_monthly',
            waiveCancellationRight: value as boolean,
            locale: 'en',
          }),
        (error: unknown) => {
          assert.ok(error instanceof AppError, `expected an AppError, got ${error}`);
          assert.equal(
            error.code,
            'WAIVER_REQUIRED',
            'Checkout got past the cancellation-right check without the ' +
              'acknowledgement. Any payment taken this way is refundable in full ' +
              'for 14 days and we would have no record of having asked.'
          );
          return true;
        }
      );
    });
  }

  test('refuses a language the waiver has not been written in', async () => {
    // Not pedantry. An unrecognised locale means the customer saw the English
    // sentence while the rest of the interface spoke to them in something
    // else, and a record of that is evidence of nothing.
    await assert.rejects(
      () =>
        createCheckoutSession('user-1', 'someone@example.com', {
          priceId: process.env.STRIPE_PRICE_PLUS_MONTHLY ?? 'price_test_plus_monthly',
          waiveCancellationRight: true,
          locale: 'fr',
        }),
      (error: unknown) => error instanceof AppError && error.code === 'VALIDATION_ERROR'
    );
  });

  test('the refusal happens before Stripe is called', async () => {
    // Ordering matters: the check sits above the subscription lookup and the
    // Stripe call, so a refused checkout costs no round trips and cannot
    // half-create anything. If this ever starts failing with a Stripe error
    // instead, the guard has drifted down the function.
    await assert.rejects(
      () =>
        createCheckoutSession('no-such-user', 'someone@example.com', {
          priceId: process.env.STRIPE_PRICE_PLUS_MONTHLY ?? 'price_test_plus_monthly',
          waiveCancellationRight: false,
          locale: 'en',
        }),
      (error: unknown) => error instanceof AppError && error.code === 'WAIVER_REQUIRED'
    );
  });
});
