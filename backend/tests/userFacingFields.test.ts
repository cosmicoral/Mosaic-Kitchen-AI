import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { userFacingStrings } from '../src/services/languageCompliance.ts';
import { translatableStringCount, translatePlan } from '../src/services/planTranslator.ts';

import type { GeneratedMealPlan } from '../src/schemas/mealPlan.ts';

// Two modules answer the same question — "which strings does the household
// actually read?" — and they answer it from two separately maintained lists:
//
//   languageCompliance.userFacingStrings   what must be in the right language
//   planTranslator.slots                   what gets translated
//
// They were both missing `unit` and `region`, and they were missing them
// independently. That is the tell: one list forgotten is an oversight, the same
// field forgotten in two places is a structure that invites it. Whatever a
// reader sees has to be in both, and this is what says so.

function plan(): GeneratedMealPlan {
  return {
    summary: 'Seven dinners.',
    estimated_total_gbp: 30,
    waste_reduction_tip: 'Use the coriander first.',
    days: [
      {
        day_index: 0,
        meals: [
          {
            slot: 'dinner',
            name: 'Jeolla-style bulgogi',
            native_name: '불고기',
            cuisine: 'korean',
            region: 'Jeolla',
            minutes: 40,
            servings: 1,
            estimated_cost_gbp: 7.1,
            ingredients: [
              { name: 'Beef, thinly sliced', quantity: 180, unit: 'g', from_pantry: false },
              { name: 'Soy sauce', quantity: 15, unit: 'ml', from_pantry: true },
            ],
            steps: ['Marinate the beef.', 'Grill it.'],
          },
        ],
        extras: [],
      },
    ],
  } as unknown as GeneratedMealPlan;
}

describe('the two lists of user-facing fields agree', () => {
  test('every string the language check guards is also translatable', () => {
    // Counted rather than compared name by name, because the two modules
    // address fields differently — one by path string, one by getter. The
    // count is the part that has to match: a field present in one and absent
    // from the other shows up as a difference of one.
    const guarded = userFacingStrings(plan()).length;
    const translatable = translatableStringCount(plan(), 'full');

    assert.equal(
      guarded,
      translatable,
      `the language check covers ${guarded} strings but the translator covers ` +
        `${translatable}. A field in one and not the other is either generated ` +
        'in the wrong language or stuck in it forever.'
    );
  });

  test('units are covered by both', () => {
    const fields = userFacingStrings(plan()).map(([field]) => field);
    assert.ok(
      fields.some((field) => field.endsWith('.unit')),
      'the language check no longer looks at ingredient units'
    );
  });

  test('region is covered by both', () => {
    const fields = userFacingStrings(plan()).map(([field]) => field);
    assert.ok(
      fields.some((field) => field.endsWith('.region')),
      'the language check no longer looks at the region label'
    );
  });
});

describe('translating the fields that were stuck', () => {
  // A stored plan cannot be regenerated, so the language check does nothing for
  // the ones already in the database. Those depend entirely on the translator
  // having a slot for the field.
  const zhPlan = () => {
    const p = plan();
    p.days[0]!.meals[0]!.region = '全罗道';
    p.days[0]!.meals[0]!.ingredients[0]!.unit = '克';
    p.days[0]!.meals[0]!.ingredients[1]!.unit = '毫升';
    return p;
  };

  test('units come from the lexicon and never reach the model', async () => {
    const seen: string[] = [];

    const result = await translatePlan(zhPlan(), 'en', 'full', (async (_s: string, user: string) => {
      seen.push(user);
      return {
        value: { items: [] },
        model: 'stub',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
      };
    }) as never);

    const sent = seen.join('\n');
    assert.ok(!sent.includes('克'), 'a unit was sent to the model despite being in the table');
    assert.ok(!sent.includes('毫升'), 'a unit was sent to the model despite being in the table');

    assert.equal(result.plan.days[0]!.meals[0]!.ingredients[0]!.unit, 'g');
    assert.equal(result.plan.days[0]!.meals[0]!.ingredients[1]!.unit, 'ml');
  });

  test('region is offered to the model rather than left in Chinese', async () => {
    let sent = '';

    await translatePlan(zhPlan(), 'en', 'full', (async (_s: string, user: string) => {
      sent = user;
      return {
        value: { items: [] },
        model: 'stub',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
      };
    }) as never);

    assert.ok(
      sent.includes('全罗道'),
      'the region was not sent for translation, so a stored Chinese plan would ' +
        'keep showing it above an English recipe'
    );
  });

  test('region is card scope, not detail', async () => {
    // It renders next to the dish name, before anything is opened. In the
    // detail tier it would stay Chinese on the summary view, which is the exact
    // bug in a smaller box.
    let sent = '';

    await translatePlan(zhPlan(), 'en', 'card', (async (_s: string, user: string) => {
      sent = user;
      return {
        value: { items: [] },
        model: 'stub',
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
      };
    }) as never);

    assert.ok(sent.includes('全罗道'), 'region is not translated at card scope');
  });
});
