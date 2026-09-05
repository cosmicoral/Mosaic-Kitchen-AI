import assert from 'node:assert/strict';
import test from 'node:test';
import { translatePlan, translatableStringCount } from '../src/services/planTranslator.ts';
import type { GeneratedMealPlan } from '../src/schemas/mealPlan.ts';

function samplePlan(): GeneratedMealPlan {
  return {
    summary: '七天十四餐,湖南菜与全罗道菜各七餐。',
    estimated_total_gbp: 89.6,
    waste_reduction_tip: '先用鲷鱼和西葫芦。',
    days: [
      {
        day_index: 0,
        meals: [
          {
            name: '剁椒鱼头',
            native_name: '剁椒鱼头',
            cuisine: 'chinese',
            region: 'hunan',
            minutes: 35,
            estimated_cost_gbp: 4.2,
            ingredients: [
              { name: '鲷鱼', quantity: 400, unit: 'g', from_pantry: true },
              { name: '生抽', quantity: 30, unit: 'ml', from_pantry: true },
            ],
            steps: ['把鱼蒸十二分钟。', '淋上热油。'],
          },
        ],
        extras: [{ name: '玫瑰鲜花饼', kind: 'dessert', estimated_cost_gbp: 1.5 }],
      },
    ],
  } as GeneratedMealPlan;
}

// A stub standing in for the model: returns the strings it was given, tagged,
// so the test can prove which fields were sent and where each answer landed.
function stubCall(transform: (values: { i: number; text: string }[]) => { i: number; text: string }[]) {
  // Batching means several calls; the prompts are concatenated so the
  // "nothing sensitive reached the model" assertions cover all of them.
  const seen: { system: string; user: string } = { system: '', user: '' };

  const call = async (system: string, user: string) => {
    seen.system = system;
    seen.user += `${user}\n`;

    const values = user.split('\n').map((line) => {
      const match = /^(\d+)\.\s([\s\S]*)$/.exec(line);
      return { i: Number(match?.[1] ?? 0), text: match?.[2] ?? line };
    });

    return {
      value: { items: transform(values) },
      model: 'stub',
      promptTokens: 100,
      completionTokens: 100,
      costUsd: 0.0001,
    };
  };

  return { call, seen };
}

test('the model never sees a cost, a cuisine or a day index', async () => {
  // This is the property that makes translating safe. If prices went to the
  // model, a translation could change what the household is told to spend.
  const { call, seen } = stubCall((values) => values.map((v) => ({ i: v.i, text: `EN:${v.text}` })));
  await translatePlan(samplePlan(), 'en', call as never);

  assert.ok(!seen.user.includes('89.6'), 'the total reached the prompt');
  assert.ok(!seen.user.includes('4.2'), 'a meal cost reached the prompt');
  assert.ok(!seen.user.includes('chinese'), 'a cuisine enum reached the prompt');
  assert.ok(!seen.user.includes('hunan'), 'a region enum reached the prompt');
  assert.ok(!seen.user.includes('day_index'), 'structure reached the prompt');
});

test('numbers and enums survive the translation untouched', async () => {
  const { call } = stubCall((values) => values.map((v) => ({ i: v.i, text: `EN:${v.text}` })));
  const { plan } = await translatePlan(samplePlan(), 'en', call as never);

  assert.equal(plan.estimated_total_gbp, 89.6);
  assert.equal(plan.days[0]!.meals[0]!.estimated_cost_gbp, 4.2);
  assert.equal(plan.days[0]!.meals[0]!.minutes, 35);
  assert.equal(plan.days[0]!.meals[0]!.cuisine, 'chinese');
  assert.equal(plan.days[0]!.meals[0]!.region, 'hunan');
  assert.equal(plan.days[0]!.meals[0]!.ingredients[0]!.quantity, 400);
  assert.equal(plan.days[0]!.meals[0]!.ingredients[0]!.from_pantry, true);
});

test('native_name is not translated', async () => {
  const { call, seen } = stubCall((values) => values.map((v) => ({ i: v.i, text: `EN:${v.text}` })));
  const { plan } = await translatePlan(samplePlan(), 'en', call as never);

  assert.equal(plan.days[0]!.meals[0]!.native_name, '剁椒鱼头');
  // And it was never offered to the model in the first place. The dish name in
  // its own script is the whole point of the field.
  assert.ok(!seen.user.includes('native_name'));
});

test('every user-facing string is translated, including extras', async () => {
  const { call } = stubCall((values) => values.map((v) => ({ i: v.i, text: `EN:${v.text}` })));
  const { plan } = await translatePlan(samplePlan(), 'en', call as never);

  assert.ok(plan.summary.startsWith('EN:'));
  assert.ok(plan.waste_reduction_tip?.startsWith('EN:'));
  assert.ok(plan.days[0]!.meals[0]!.name.startsWith('EN:'));
  assert.ok(plan.days[0]!.meals[0]!.steps[0]!.startsWith('EN:'));
  assert.ok(plan.days[0]!.meals[0]!.steps[1]!.startsWith('EN:'));
  assert.ok(plan.days[0]!.meals[0]!.ingredients[0]!.name.startsWith('EN:'));
  assert.ok(plan.days[0]!.meals[0]!.ingredients[1]!.name.startsWith('EN:'));
  assert.ok(plan.days[0]!.extras![0]!.name.startsWith('EN:'));
});

test('the original plan is not mutated', async () => {
  const original = samplePlan();
  const before = JSON.stringify(original);

  const { call } = stubCall((values) => values.map((v) => ({ i: v.i, text: `EN:${v.text}` })));
  await translatePlan(original, 'en', call as never);

  assert.equal(JSON.stringify(original), before);
});

test('a short answer translates what came back and leaves the rest alone', async () => {
  // The earlier version demanded an exact-length list and threw the whole
  // translation away over one missing entry — which, on a fourteen-meal plan
  // of two hundred strings, is most of the time. Each item now carries its own
  // index, so a short answer costs only the entries actually missing.
  const { call } = stubCall((values) =>
    values.slice(0, 3).map((v) => ({ i: v.i, text: `EN:${v.text}` }))
  );

  const result = await translatePlan(samplePlan(), 'en', call as never);

  assert.equal(result.translated, 3);
  assert.equal(result.total, 8);
  assert.ok(result.plan.summary.startsWith('EN:'));
  // Untranslated entries keep readable original text rather than being blanked.
  assert.equal(result.plan.days[0]!.extras![0]!.name, '玫瑰鲜花饼');
});

test('an out-of-range index is ignored rather than written somewhere wrong', async () => {
  // A stray index is the one way an indexed merge could corrupt the plan:
  // writing a dish name onto an unrelated field. It is dropped instead.
  const { call } = stubCall(() => [{ i: 9999, text: 'nowhere' }]);

  const result = await translatePlan(samplePlan(), 'en', call as never);

  assert.equal(result.translated, 0);
  assert.equal(result.plan.summary, '七天十四餐,湖南菜与全罗道菜各七餐。');
});

test('a failing batch does not abandon the plan', async () => {
  const call = async () => {
    throw new Error('model unavailable');
  };

  const result = await translatePlan(samplePlan(), 'en', call as never);

  assert.equal(result.translated, 0);
  // Original text, not blanks. Readable, just not translated.
  assert.equal(result.plan.summary, '七天十四餐,湖南菜与全罗道菜各七餐。');
});

test('a blank translation leaves the original string in place', async () => {
  const { call } = stubCall((values) =>
    values.map((v, index) => ({ i: v.i, text: index === 0 ? '' : 'EN' }))
  );
  const { plan } = await translatePlan(samplePlan(), 'en', call as never);

  assert.equal(plan.summary, '七天十四餐,湖南菜与全罗道菜各七餐。');
});

test('the string count matches what the plan actually contains', () => {
  // summary + tip + name + 2 steps + 2 ingredients + 1 extra
  assert.equal(translatableStringCount(samplePlan()), 8);
});
