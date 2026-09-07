import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { TIERS, entitlementsFor, type Tier } from '../src/services/entitlements.ts';
import { worstCaseMonthlyCostGbp } from '../src/services/costModel.ts';

// The allowance tables in README.md and docs/billing.md have disagreed with
// the code three separate times: old prices, an old free-tier row, and a test
// count that was off by three. Every one was found by a person reading a file,
// and every one had been wrong for days.
//
// A README is documentation until somebody makes a decision from it, at which
// point it is a specification with nothing enforcing it. This turns the tables
// into assertions. It runs in `npm test` rather than in a script somebody
// remembers to run, because the failure mode being prevented is precisely
// forgetting.

const repo = join(import.meta.dirname, '..', '..');

const DOCS = ['README.md', join('docs', 'billing.md')] as const;

// The markdown rows are `| Label | free | plus | pro |`, in tier order.
const ROWS: Array<[label: string, key: keyof ReturnType<typeof entitlementsFor>]> = [
  ['Household members', 'householdMembers'],
  ['Meal plans / month', 'mealPlansPerMonth'],
  ['Meals per plan', 'maxMealsPerPlan'],
  ['Cook-from-pantry / month', 'pantryCooksPerMonth'],
  ['Plan translations / month', 'planTranslationsPerMonth'],
];

function cellsFor(doc: string, label: string): string[] | null {
  const line = doc.split('\n').find((candidate) => candidate.startsWith(`| ${label} |`));
  if (!line) return null;

  return line
    .split('|')
    .slice(2, 5)
    .map((cell) => cell.trim());
}

describe('the allowance tables in the docs', () => {
  for (const file of DOCS) {
    const doc = readFileSync(join(repo, file), 'utf8');

    test(`${file} states the allowances the code enforces`, () => {
      let checked = 0;

      for (const [label, key] of ROWS) {
        const cells = cellsFor(doc, label);
        // A row that is absent claims nothing. A row that is present must be
        // true — the same rule the pricing-copy test uses, for the same
        // reason.
        if (!cells) continue;

        TIERS.forEach((tier: Tier, index) => {
          const claimed = cells[index]?.replace(/\*|_/g, '').trim();
          assert.ok(claimed !== undefined, `${file}: "${label}" has no cell for ${tier}`);

          // An em dash is how a zero allowance is written in prose, because
          // "0 camera scans a month" is a strange thing to print on a pricing
          // table. It has to mean zero, though, not "unspecified".
          const expected = entitlementsFor(tier)[key];
          if (claimed === '—') {
            assert.equal(
              expected,
              0,
              `${file}: "${label}" shows — for ${tier}, but the allowance is ${expected}`
            );
          } else {
            assert.equal(
              Number(claimed),
              expected,
              `${file}: "${label}" claims ${claimed} for ${tier}, code allows ${expected}`
            );
          }
          checked += 1;
        });
      }

      assert.ok(checked > 0, `${file} has no allowance table — has it been renamed?`);
    });
  }
});

describe('the cost figures quoted in the docs', () => {
  test('the free-tier worst case is quoted correctly wherever it appears', () => {
    // Convention: a live claim about the free tier's cost is written in bold.
    // Everything else — the soft-cap default, the Plus figure, the £0.0342
    // that the tier used to cost — is plain text and is not checked.
    //
    // Two earlier attempts explain the convention. The first matched every
    // small pound amount in the file and filtered to those near the right
    // answer, which is a test that can only see correct numbers and therefore
    // cannot catch a wrong one. The second anchored on the word "costs", which
    // caught "a Plus subscriber costs £0.14" — a true sentence about a
    // different tier.
    //
    // The real difficulty is that these documents deliberately quote the old
    // figure alongside the new one, because the reason for the change is the
    // interesting part. No amount of pattern-matching distinguishes "costs
    // £0.0158" from "used to cost £0.0342"; a marker has to. Bold is the
    // marker, and this test is where it is written down.
    const actual = worstCaseMonthlyCostGbp('free');
    let found = 0;

    for (const file of DOCS) {
      const doc = readFileSync(join(repo, file), 'utf8');

      for (const match of doc.matchAll(/\*\*£(0\.0\d+)\*\*/g)) {
        assert.ok(
          Math.abs(Number(match[1]) - actual) < 0.0006,
          `${file} claims the free tier costs £${match[1]}; the model says £${actual.toFixed(4)}`
        );
        found += 1;
      }
    }

    assert.ok(
      found > 0,
      'no bolded free-tier cost figure found in the docs — the marker convention has been lost'
    );
  });

  test('the annual figure for 500 free users is quoted correctly', () => {
    const actual = worstCaseMonthlyCostGbp('free') * 500 * 12;

    for (const file of DOCS) {
      const doc = readFileSync(join(repo, file), 'utf8');
      for (const match of doc.matchAll(/£(\d{2,4}) a year for 500/g)) {
        assert.ok(
          Math.abs(Number(match[1]) - actual) <= 1,
          `${file} says £${match[1]} a year for 500 free accounts; the model says £${actual.toFixed(0)}`
        );
      }
    }
  });
});

describe('deployment routes match the application', () => {
  test('the Stripe webhook path in the runbook is the mounted route', () => {
    const app = readFileSync(join(repo, 'backend', 'src', 'app.ts'), 'utf8');
    const checks = readFileSync(join(repo, 'docs', 'pre-deploy-checks.md'), 'utf8');
    const deployment = readFileSync(join(repo, 'docs', 'deployment.md'), 'utf8');
    const route = '/api/stripe/webhook';

    assert.match(app, new RegExp(route.replaceAll('/', '\\/')));
    assert.ok(
      checks.includes(route),
      `pre-deploy checks do not use the mounted Stripe webhook route ${route}`
    );
    assert.ok(
      deployment.includes(route),
      `deployment guide does not name the production Stripe webhook route ${route}`
    );
    assert.ok(
      !checks.includes('/api/billing/webhook'),
      'pre-deploy checks still contain the old, unmounted Stripe webhook route'
    );
  });
});
