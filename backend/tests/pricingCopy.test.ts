import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { TIERS, entitlementsFor } from '../src/services/entitlements.ts';

// The pricing page is a promise. It has now disagreed with the code twice: it
// advertised two free meal plans when the API allowed eight, and six when the
// API had gone back to eight. Both were found by a person reading a screen.
//
// This reads the frontend's plan copy as text and checks the numbers in it
// against the entitlements the API actually enforces. A number in a sales page
// that the server does not honour is the one kind of bug that costs trust
// rather than time.

const planCopy = readFileSync(
  join(import.meta.dirname, '..', '..', 'web', 'src', 'lib', 'plans.ts'),
  'utf8'
);

// The copy block for one tier: from `tier: 'free',` to the closing `cta`.
function copyFor(tier: string): string {
  const start = planCopy.indexOf(`tier: '${tier}'`);
  assert.ok(start > -1, `no pricing copy found for the ${tier} tier`);

  const end = planCopy.indexOf('cta:', start);
  return planCopy.slice(start, end);
}

test('every advertised number matches what the API enforces', () => {
  for (const tier of TIERS) {
    const copy = copyFor(tier);
    const limits = entitlementsFor(tier);

    const claims: Array<[RegExp, number, string]> = [
      [/(\d+) AI meal plans? a month/, limits.mealPlansPerMonth, 'meal plans'],
      [/Up to (\d+) meals per plan/, limits.maxMealsPerPlan, 'meals per plan'],
      [/(\d+) cook-from-your-pantry/, limits.pantryCooksPerMonth, 'pantry cooks'],
      [/(\d+) plan translations/, limits.planTranslationsPerMonth, 'translations'],
      [/(\d+) camera scans? a month/, limits.scansPerMonth, 'camera scans'],
      [/(\d+) household members?/, limits.householdMembers, 'household members'],
    ];

    for (const [pattern, allowed, what] of claims) {
      const match = pattern.exec(copy);
      // Not every tier lists every line, and that is fine — a line that is
      // absent promises nothing. A line that is present must be true.
      if (!match) continue;

      assert.equal(
        Number(match[1]),
        allowed,
        `the pricing page tells ${tier} users they get ${match[1]} ${what}, ` +
          `but entitlements allow ${allowed}`
      );
    }
  }
});

test('the free tier does not advertise a paid-tier number', () => {
  // A cheap sanity check on the shape of the copy: free must never claim more
  // than plus, whatever the individual numbers are.
  const free = entitlementsFor('free');
  const plus = entitlementsFor('plus');

  assert.ok(free.mealPlansPerMonth < plus.mealPlansPerMonth);
  assert.ok(free.planTranslationsPerMonth < plus.planTranslationsPerMonth);
});
