import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

// Where the free tier's cost is actually decided.
//
// The entitlement numbers are the easy part; what makes them true is that
// every path which spends money reads them, that nothing spends money without
// being recorded, and that the counter resets when the pricing page says it
// does. All three have been wrong here at some point, and none of the three
// produced an error when it was.
//
// These read source rather than exercising the database, deliberately. A test
// that needs Postgres does not run in CI without a database, and a guard that
// only runs sometimes is not a guard. The trade is that they check the code is
// shaped correctly rather than that it behaves correctly at runtime — which is
// the right trade for "somebody deleted the quota check", the failure these
// exist to catch, and the wrong one for anything subtler.

const src = join(import.meta.dirname, '..', 'src');

function read(...parts: string[]): string {
  return readFileSync(join(src, ...parts), 'utf8');
}

// Prose about a rule reads a great deal like the rule itself. Anywhere a test
// below asserts the *absence* of something, it has to look at the code rather
// than at the explanation of why the code is that way.
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const mealPlanService = read('services', 'mealPlanService.ts');
const glossService = read('services', 'glossService.ts');
const aiUsageRepository = read('repositories', 'aiUsageRepository.ts');

describe('every spending path is metered', () => {
  test('nothing calls the model without recording what it cost', () => {
    // The bug this is for: glossService called generateStructured and recorded
    // nothing at all. It appeared in no quota and in no spend total, so the
    // whole-product ceiling could not see it and neither could the per-account
    // one. It was not a large cost. It was an invisible one, which is worse,
    // because the first evidence would have been the invoice.
    const callers = readdirSync(join(src, 'services'))
      .filter((name) => name.endsWith('.ts'))
      .map((name) => [name, readFileSync(join(src, 'services', name), 'utf8')] as const)
      // Anything that reaches for one of these at all. Deliberately looser
      // than "calls it": glossService passes generateStructured in as a
      // default parameter and invokes it under another name, which a
      // call-shaped pattern would have missed — and glossService is the file
      // this test was written for.
      .filter(([, source]) => /\b(generateStructured|generateMealPlan)\b/.test(source))
      // openai.ts defines them; planTranslator returns its cost to the caller
      // rather than recording it, which is the same discipline one level up.
      .filter(([name]) => !['openai.ts', 'planTranslator.ts'].includes(name));

    assert.ok(callers.length > 0, 'found no model callers — the regex has rotted');

    for (const [name, source] of callers) {
      assert.match(
        source,
        /aiUsageRepository|recordUsage/,
        `${name} calls the model but never records usage, so no ceiling can see it`
      );
    }
  });

  test('the gloss path records failures as well as successes', () => {
    // A retry loop that fails every time still bills. A guard that counts only
    // successes is blind to exactly the case it exists for.
    assert.match(
      glossService,
      /recordUsage\([^)]*false\s*\)/s,
      'a failed gloss call is not recorded, so a failing loop would be invisible'
    );
  });

  test('recording a gloss cannot take down the page it annotates', () => {
    // The inverse risk of the line above: a gloss is decoration on a shopping
    // list that is already correct without it, so a database hiccup on the
    // accounting path must not remove the list.
    assert.match(
      glossService,
      /async function recordUsage[\s\S]{0,600}?try\s*\{[\s\S]*?catch/,
      'recordUsage does not swallow its own failures'
    );
  });
});

describe('enforcement happens on the server, before the money is spent', () => {
  test('each generation path checks a quota before calling the model', () => {
    // Ordering is the whole point. A check after the call still returns the
    // right error to the user and has already paid for the plan it refuses to
    // show them.
    for (const fn of ['generate', 'generateFromPantry']) {
      const start = mealPlanService.indexOf(`export async function ${fn}(`);
      assert.ok(start > -1, `${fn} not found`);

      const body = mealPlanService.slice(start, start + 6_000);
      const quotaAt = body.search(/countSuccessfulThisMonth/);
      const modelAt = body.search(/await modelCall\(/);

      assert.ok(quotaAt > -1, `${fn} does not check a quota at all`);
      assert.ok(modelAt > -1, `${fn} does not appear to call the model`);
      assert.ok(quotaAt < modelAt, `${fn} calls the model before checking the quota`);
    }
  });

  test('the per-account spend ceiling is checked before the model too', () => {
    for (const fn of ['generate', 'generateFromPantry']) {
      const start = mealPlanService.indexOf(`export async function ${fn}(`);
      const body = mealPlanService.slice(start, start + 6_000);

      const bandAt = body.search(/userSpendBand\(/);
      const modelAt = body.search(/await modelCall\(/);

      assert.ok(bandAt > -1, `${fn} does not read the spend band`);
      assert.ok(bandAt < modelAt, `${fn} reads the spend band after spending`);
      assert.match(body.slice(bandAt), /assertNotBlocked\(/, `${fn} reads the band but ignores it`);
    }
  });

  test('the quota is read from storage, never from the request', () => {
    // The bypass this forecloses: a client that sends its own tier, or its own
    // count of plans used, and is believed. Everything the limit is computed
    // from has to come from the database on this request — which is also what
    // makes a new session, a refresh or a direct API call no different from
    // the browser tab the user already has open.
    const start = mealPlanService.indexOf('export async function generate(');
    const body = mealPlanService.slice(start, start + 3_000);

    assert.match(body, /await billingService\.getTier\(userId\)/);
    assert.match(body, /entitlementsFor\(tier\)/);
    assert.ok(
      !/req\.|request\.|body\./.test(stripComments(body)),
      'the generation path reads something off the request when deciding a limit'
    );
  });

  test('the advertised meal cap is enforced, not merely displayed', () => {
    // maxMealsPerPlan sat in the entitlement table and on the pricing page and
    // was checked nowhere: meals_per_week was validated against a global
    // maximum of 21, so a free account could ask for 21 meals and triple the
    // cost of every plan while the page said "up to 7".
    assert.match(mealPlanService, /function capMealsToTier\(/);
    assert.match(mealPlanService, /capMealsToTier\(\s*rawProfile,\s*limits\.maxMealsPerPlan\s*\)/);
  });

  test('clamping the meal count does not rewrite the stored profile', () => {
    // A cap applied by saving a smaller number would be a downgrade quietly
    // editing the household's settings, and upgrading again would not restore
    // them. It has to be applied to a copy, at generation time.
    const start = mealPlanService.indexOf('function capMealsToTier(');
    const body = mealPlanService.slice(start, mealPlanService.indexOf('\n}', start));

    assert.match(body, /\{\s*\.\.\.profile,\s*meals_per_week:/);
    assert.ok(
      !/profileRepository|upsert|save/i.test(stripComments(body)),
      'capMealsToTier writes to storage'
    );
  });
});

describe('regeneration counts once', () => {
  test('a plan is recorded as successful exactly once however many attempts it took', () => {
    // The retry loop can call the model twice. Both calls are recorded — the
    // spend guard needs to see the money — but only a clean plan is recorded
    // as succeeded, and only successes count against the allowance. So a
    // regeneration that needed two attempts costs the user one credit and
    // costs us two calls, which is the correct division: they did not ask for
    // the retry, we did.
    const start = mealPlanService.indexOf('export async function generate(');
    const body = mealPlanService.slice(start, start + 8_000);

    assert.match(body, /succeeded:\s*isClean/, 'attempts are recorded as unconditionally successful');
    assert.match(
      aiUsageRepository,
      /succeeded = true[\s\S]*?date_trunc\('month', now\(\)\)/,
      'the quota count no longer filters on success'
    );
  });

  test('a failed generation does not consume an allowance', () => {
    // Charging somebody a credit for an error is the version of this that
    // generates support email.
    const start = mealPlanService.indexOf('export async function generate(');
    const body = mealPlanService.slice(start, start + 8_000);

    assert.match(body, /succeeded:\s*false/, 'a failed call is not recorded as a failure');
  });

  test('re-reading a cached translation is free', () => {
    // Translation is metered, so the cache has to be consulted before the
    // quota rather than after it: opening a plan you have already had
    // translated must not cost a credit every time.
    const start = mealPlanService.indexOf('export async function readInLocale(');
    const body = mealPlanService.slice(start, start + 4_000);

    const cacheAt = body.search(/findTranslation\(/);
    const quotaAt = body.search(/countSuccessfulThisMonth/);

    assert.ok(cacheAt > -1 && quotaAt > -1);
    assert.ok(cacheAt < quotaAt, 'the translation cache is checked after the quota is spent');
  });
});

describe('degrading is cheaper without being broken', () => {
  test('a degraded account gets fewer attempts, not fewer safety checks', () => {
    // The retry loop is a quality mechanism. Dropping the second attempt makes
    // a plan more likely to be refused; it must never make an unsafe plan more
    // likely to be accepted, so the violation checks stay where they are and
    // only the loop bound moves.
    assert.match(mealPlanService, /const maxAttempts = band === 'normal' \? MAX_ATTEMPTS : 1/);
    assert.ok(
      !/band === 'degraded'[^\n]*findViolations/.test(stripComments(mealPlanService)),
      'the allergen check is conditional on the spend band'
    );
    assert.match(mealPlanService, /if \(isClean\)/, 'the clean-plan gate is gone');
  });

  test('a degraded translation is cached under the scope it actually produced', () => {
    // Storing a card-scope translation as if it were the full one would be a
    // permanent lie: the account recovers next month, asks for the cooking
    // steps, and is handed the cached summary for ever with nothing to
    // indicate the steps were never translated.
    assert.match(
      mealPlanService,
      /saveTranslation\(\s*row\.id,\s*locale,\s*effectiveScope,/,
      'a degraded translation is cached under the requested scope rather than the produced one'
    );
  });

  test('the translation path degrades rather than erroring', () => {
    // A reader over a budget still gets their dinner, in the language the plan
    // was written in. Nothing on this path throws.
    const start = mealPlanService.indexOf('export async function readInLocale(');
    const body = mealPlanService.slice(start, start + 4_000);

    assert.match(body, /band === 'blocked'\) return row\.plan/);
    assert.ok(
      !/assertNotBlocked/.test(stripComments(body)),
      'readInLocale throws on a blocked account instead of showing the original plan'
    );
  });
});

describe('the counter resets on a calendar month', () => {
  test('every quota read uses the same month boundary', () => {
    // Deliberately not the Stripe billing anniversary, and worth being
    // explicit about because the two are easy to conflate. A calendar month is
    // what the pricing page means by "a month", it is the same for free
    // accounts that have no billing cycle at all, and it needs no subscription
    // lookup to compute — so there is no state that can disagree with itself.
    //
    // The risk of changing it is one-directional and invisible: a boundary
    // that moved later would hand every user a second allowance in the gap,
    // and nothing would report it.
    const boundaries = [...aiUsageRepository.matchAll(/created_at >= ([^\n]+)/g)].map((match) =>
      // Trailing template-literal punctuation: some of these queries close the
      // backtick and the argument list on the same line, and the first version
      // of this test failed on a comma rather than on anything about dates.
      match[1]?.trim().replace(/[`,\s]+$/, '')
    );

    assert.ok(boundaries.length >= 3, 'expected several month-bounded queries');
    for (const boundary of boundaries) {
      assert.equal(
        boundary,
        "date_trunc('month', now())",
        'a usage query uses a different month boundary from the others'
      );
    }
  });

  test('free and paid accounts reset on the same boundary', () => {
    // One code path, so there is nothing to keep in step. Asserted rather than
    // assumed because "free users reset differently" is a plausible-sounding
    // change that would silently double somebody's allowance.
    //
    // Checked by what the module depends on rather than by scanning it for the
    // word "tier": the first version of this did the latter and failed on a
    // comment explaining why a failed call must not eat a free-tier allowance,
    // which is a sentence arguing for the property being tested. A test that
    // rejects its own justification is measuring the wrong thing.
    assert.ok(
      !/^\s*import .*(billingService|entitlements)/m.test(aiUsageRepository),
      'the usage repository now depends on billing, so the reset can differ by plan'
    );
    assert.ok(
      !/\btier\b/.test(stripComments(aiUsageRepository)),
      'a usage query branches on tier'
    );
  });
});
