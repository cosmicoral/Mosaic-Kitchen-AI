import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeLanguageViolation,
  findLanguageViolation,
} from '../src/services/languageCompliance.ts';
import type { GeneratedMealPlan } from '../src/schemas/mealPlan.ts';

function meal(overrides: Partial<GeneratedMealPlan['days'][0]['meals'][0]> = {}) {
  return {
    name: 'Hunan steamed fish head',
    native_name: '剁椒鱼头',
    cuisine: 'chinese',
    region: 'hunan',
    minutes: 35,
    estimated_cost_gbp: 4.2,
    ingredients: [{ name: 'Sea bass', quantity: 400, unit: 'g', from_pantry: false }],
    steps: ['Steam the fish for twelve minutes.'],
    ...overrides,
  } as GeneratedMealPlan['days'][0]['meals'][0];
}

function plan(overrides: Partial<GeneratedMealPlan> = {}): GeneratedMealPlan {
  return {
    summary: 'Seven dinners built around what is already in the kitchen.',
    estimated_total_gbp: 4.2,
    waste_reduction_tip: 'Use the spring onions before the peppers.',
    days: [{ day_index: 0, meals: [meal()], extras: [] }],
    ...overrides,
  } as GeneratedMealPlan;
}

test('an English plan passes even though native_name is Chinese', () => {
  // The whole point of native_name. If this ever fails, the check has started
  // punishing the feature it was written to protect.
  assert.equal(findLanguageViolation(plan(), 'en'), null);
});

test('English requested, Chinese dish name returned is a violation', () => {
  const violation = findLanguageViolation(
    plan({ days: [{ day_index: 0, meals: [meal({ name: '剁椒鱼头' })], extras: [] }] }),
    'en'
  );
  assert.ok(violation);
  assert.match(violation.field, /meals\[0\]\.name/);
});

test('English requested, Chinese cooking steps returned is a violation', () => {
  const violation = findLanguageViolation(
    plan({
      days: [{ day_index: 0, meals: [meal({ steps: ['把鱼蒸十二分钟。'] })], extras: [] }],
    }),
    'en'
  );
  assert.ok(violation);
  assert.match(violation.field, /steps\[0\]/);
});

test('English requested, Chinese ingredient copied through from the pantry is a violation', () => {
  // The exact failure this was written for: the pantry holds 生抽, the model
  // reads it in the prompt and hands it straight back in an English plan.
  const violation = findLanguageViolation(
    plan({
      days: [
        {
          day_index: 0,
          meals: [
            meal({ ingredients: [{ name: '生抽', quantity: 30, unit: 'ml', from_pantry: true }] }),
          ],
          extras: [],
        },
      ],
    }),
    'en'
  );
  assert.ok(violation);
  assert.match(violation.field, /ingredients\[0\]/);
});

test('English requested, Chinese summary returned is a violation', () => {
  const violation = findLanguageViolation(plan({ summary: '七天十四餐。' }), 'en');
  assert.ok(violation);
  assert.equal(violation.field, 'summary');
});

test('Chinese requested and returned passes', () => {
  const zhPlan = plan({
    summary: '七天十四餐,湖南菜与全罗道菜各七餐。',
    days: [
      {
        day_index: 0,
        meals: [meal({ name: '剁椒鱼头', steps: ['把鱼蒸十二分钟。'] })],
        extras: [],
      },
    ],
  });
  assert.equal(findLanguageViolation(zhPlan, 'zh'), null);
});

test('Chinese requested, all-English plan is a violation', () => {
  // native_name would normally rescue this, so it is cleared here to describe
  // the case the check is actually for: an entirely English answer.
  const enPlan = plan({
    days: [{ day_index: 0, meals: [meal({ native_name: '' })], extras: [] }],
  });
  const violation = findLanguageViolation(enPlan, 'zh');
  assert.ok(violation);
  assert.equal(violation.locale, 'zh');
});

test('extras are checked too', () => {
  const violation = findLanguageViolation(
    plan({
      days: [
        {
          day_index: 0,
          meals: [meal()],
          extras: [{ name: '玫瑰鲜花饼', kind: 'dessert', estimated_cost_gbp: 1 }],
        },
      ],
    } as Partial<GeneratedMealPlan>),
    'en'
  );
  assert.ok(violation);
  assert.match(violation.field, /extras\[0\]/);
});

test('the retry text names the field and tells the model what to do with it', () => {
  const violation = findLanguageViolation(plan({ summary: '七天十四餐。' }), 'en');
  assert.ok(violation);

  const text = describeLanguageViolation(violation);
  assert.match(text, /British English/);
  // Without this line the model repeats the same mistake: it was copying the
  // Chinese it found in the prompt, not inventing it.
  assert.match(text, /translated into English/);
  assert.match(text, /native_name/);
});
