import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, test } from 'node:test';

import {
  bandFor,
  classifySpend,
  freeTierBand,
  paidTierBand,
} from '../src/config/aiBudget.ts';
import { entitlementsFor } from '../src/services/entitlements.ts';
import { worstCaseMonthlyCostGbp } from '../src/services/costModel.ts';

// Request counts and money are two different bounds, and the second one had
// nothing enforcing it. An account can sit inside every quota and still cost
// several times what the pricing assumed, because a plan for six people with a
// full pantry and a retry is not the same call as a plan for one person.
//
// These tests are about the shape of the bands rather than the exact numbers:
// the numbers are configurable on purpose, and asserting them would be
// asserting today's environment.

const ENV_KEYS = [
  'FREE_AI_COST_TARGET_GBP',
  'FREE_AI_COST_SOFT_CAP_GBP',
  'FREE_AI_COST_HARD_CAP_GBP',
  'PAID_AI_COST_TARGET_GBP',
  'PAID_AI_COST_SOFT_CAP_GBP',
  'PAID_AI_COST_HARD_CAP_GBP',
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('the bands themselves', () => {
  test('target sits below soft, which sits below hard', () => {
    // Out of order, the middle band vanishes: a soft cap above the hard cap
    // means the account is blocked before it is ever degraded, and the degrade
    // path — the entire reason for having three numbers instead of one — would
    // be dead code that still looked present.
    for (const band of [freeTierBand(), paidTierBand()]) {
      assert.ok(band.targetGbp < band.softCapGbp, 'target is not below the soft cap');
      assert.ok(band.softCapGbp < band.hardCapGbp, 'soft cap is not below the hard cap');
    }
  });

  test('a paid account is bounded far more loosely than a free one', () => {
    // A Plus subscriber costs about £0.14 of AI against £7.99 of revenue, so a
    // ceiling tight enough to protect a budget would only ever hurt somebody
    // who has paid. This is a runaway detector for them, not a ration.
    assert.ok(paidTierBand().hardCapGbp > freeTierBand().hardCapGbp * 10);
  });

  test('bandFor picks by whether the account pays, not by tier name', () => {
    assert.deepEqual(bandFor(true), freeTierBand());
    assert.deepEqual(bandFor(false), paidTierBand());
  });
});

describe('classification', () => {
  const band = { targetGbp: 1, softCapGbp: 2, hardCapGbp: 3 };

  test('spend below the soft cap is normal, including at the target', () => {
    assert.equal(classifySpend(0, band), 'normal');
    // At the target exactly. The target is a reporting line, not a behaviour
    // change — degrading here would make the middle band start one number
    // earlier than the name says it does.
    assert.equal(classifySpend(1, band), 'normal');
    assert.equal(classifySpend(1.99, band), 'normal');
  });

  test('the caps are inclusive, so an exact hit degrades and blocks', () => {
    // A cap that only bites strictly above itself is a cap that a value
    // landing exactly on it slips past, and floating-point money lands on
    // round numbers more often than it has any right to.
    assert.equal(classifySpend(2, band), 'degraded');
    assert.equal(classifySpend(2.5, band), 'degraded');
    assert.equal(classifySpend(3, band), 'blocked');
    assert.equal(classifySpend(99, band), 'blocked');
  });
});

describe('configuration', () => {
  test('the environment overrides the defaults', () => {
    process.env.FREE_AI_COST_HARD_CAP_GBP = '0.5';
    assert.equal(freeTierBand().hardCapGbp, 0.5);
  });

  test('a nonsense value falls back rather than disabling the ceiling', () => {
    // The dangerous direction. Number('') is 0 and Number('abc') is NaN, and
    // either one used directly would produce a hard cap of zero or a
    // comparison that is false for every input — the first blocks everybody,
    // the second blocks nobody and looks exactly like a working guard.
    for (const bad of ['', 'abc', '-1', '0']) {
      process.env.FREE_AI_COST_HARD_CAP_GBP = bad;
      assert.ok(
        freeTierBand().hardCapGbp > 0,
        `a hard cap of "${bad}" produced a non-positive ceiling`
      );
    }
  });
});

describe('the bands against the free tier they are meant to bound', () => {
  test('an account using every free allowance is not degraded for it', () => {
    // The most important relationship in this file. If the soft cap sat below
    // the worst case the quotas already permit, every thorough free user would
    // be silently degraded for doing exactly what the pricing page invited
    // them to do — and the symptom would be plans that are slightly worse for
    // no visible reason, which is close to unreportable.
    assert.ok(
      worstCaseMonthlyCostGbp('free') < freeTierBand().softCapGbp,
      'the free quotas already cost more than the soft cap allows'
    );
  });

  test('the hard cap is reachable only by something the quotas do not explain', () => {
    // Twice the worst legitimate case. Below that the ceiling would be
    // catching ordinary variation; above it, a genuine loop would run for a
    // long time before anything stopped it.
    const band = freeTierBand();
    const worst = worstCaseMonthlyCostGbp('free');

    assert.ok(band.hardCapGbp > worst * 2, 'the hard cap is too close to legitimate use');
    assert.ok(band.hardCapGbp < worst * 10, 'the hard cap is too far away to bound anything');
  });
});

describe('what the user is told', () => {
  const spendGuard = readFileSync(
    join(import.meta.dirname, '..', 'src', 'services', 'spendGuard.ts'),
    'utf8'
  );

  test('no cost figure reaches a user-facing message', () => {
    // The requirement is that internal cost numbers stay internal. Pounds and
    // token counts appear in this file in plenty of places — every one of them
    // must be inside a console.* call, never inside an AppError.
    const messages = [...spendGuard.matchAll(/new AppError\(([\s\S]*?)'(?:[A-Z_]+)'/g)].map(
      (match) => match[1] ?? ''
    );

    assert.ok(messages.length > 0, 'found no AppError constructions — the regex has rotted');

    for (const message of messages) {
      assert.ok(
        !/£|\$|cost|token|cap|spend|budget/i.test(message),
        `a user-facing message leaks an internal cost detail: ${message.trim()}`
      );
    }
  });

  test('the free-tier wording does not blame the user for a budget', () => {
    // "Paused while we catch up with demand" and "you have reached this
    // month's limit" are both true and neither invites the reader to work out
    // what they cost us.
    assert.match(spendGuard, /reached this month’s limit on your free plan/);
  });
});

describe('the quota and the ceiling are different bounds', () => {
  test('the ceiling is not merely a restatement of the request count', () => {
    // If the hard cap were exactly the worst case the quotas permit, it would
    // add nothing: the request counter would always trip first and the money
    // guard would be decoration. It has to be reachable by a pattern of use
    // that the counts alone cannot describe.
    const free = entitlementsFor('free');
    assert.ok(free.mealPlansPerMonth > 0, 'the free tier has no plan allowance to compare against');

    assert.notEqual(
      freeTierBand().hardCapGbp,
      worstCaseMonthlyCostGbp('free'),
      'the spend ceiling and the request quota bound exactly the same thing'
    );
  });
});
