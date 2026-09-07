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
    waste_reduction_tip: '先用小葱,再用彩椒。',
    days: [
      {
        day_index: 0,
        meals: [
          meal({
            name: '剁椒鱼头',
            region: '湖南',
            steps: ['把鱼蒸十二分钟。'],
            ingredients: [
              { name: '鲈鱼', quantity: 400, unit: '克', from_pantry: false },
            ],
          }),
        ],
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

test('Chinese requested, one Chinese field cannot hide an English dish name', () => {
  const mixed = plan({
    summary: '这是一周的家常餐单。',
    waste_reduction_tip: '先用容易变质的蔬菜。',
    days: [
      {
        day_index: 0,
        meals: [
          meal({
            name: 'Jeolla-style grilled mackerel',
            region: '全罗道',
            steps: ['把鲭鱼煎至金黄。'],
            ingredients: [
              { name: '鲭鱼', quantity: 180, unit: '克', from_pantry: false },
            ],
          }),
        ],
        extras: [],
      },
    ],
  });

  const violation = findLanguageViolation(mixed, 'zh');
  assert.ok(violation);
  assert.match(violation.field, /meals\[0\]\.name/);
});

test('Chinese requested, Korean script belongs only in native_name', () => {
  const mixed = plan({
    summary: '这是一周的家常餐单。',
    waste_reduction_tip: '先用容易变质的蔬菜。',
    days: [
      {
        day_index: 0,
        meals: [
          meal({
            name: '고등어구이',
            native_name: '고등어구이',
            region: '全罗道',
            steps: ['把鲭鱼煎至金黄。'],
            ingredients: [
              { name: '鲭鱼', quantity: 180, unit: '克', from_pantry: false },
            ],
          }),
        ],
        extras: [],
      },
    ],
  });

  const violation = findLanguageViolation(mixed, 'zh');
  assert.ok(violation);
  assert.match(violation.field, /meals\[0\]\.name/);
});

test('Chinese requested, English region and method are checked independently', () => {
  const chinese = plan({
    summary: '这是一周的家常餐单。',
    waste_reduction_tip: '先用容易变质的蔬菜。',
    days: [
      {
        day_index: 0,
        meals: [
          meal({
            name: '全罗道烤鲭鱼',
            region: 'Jeolla',
            steps: ['Pan-fry the mackerel until golden.'],
            ingredients: [
              { name: '鲭鱼', quantity: 180, unit: '克', from_pantry: false },
            ],
          }),
        ],
        extras: [],
      },
    ],
  });

  const regionViolation = findLanguageViolation(chinese, 'zh');
  assert.ok(regionViolation);
  assert.match(regionViolation.field, /region/);

  chinese.days[0]!.meals[0]!.region = '全罗道';
  const stepViolation = findLanguageViolation(chinese, 'zh');
  assert.ok(stepViolation);
  assert.match(stepViolation.field, /steps\[0\]/);
});

test('metric unit symbols remain valid in a Chinese recipe', () => {
  const chinese = plan({
    summary: '这是一周的家常餐单。',
    waste_reduction_tip: '先用容易变质的蔬菜。',
    days: [
      {
        day_index: 0,
        meals: [
          meal({
            name: '湖南蒸鱼头',
            region: '湖南',
            steps: ['把鱼蒸十二分钟。'],
            ingredients: [
              { name: '鲈鱼', quantity: 400, unit: 'g', from_pantry: false },
            ],
          }),
        ],
        extras: [],
      },
    ],
  });

  assert.equal(findLanguageViolation(chinese, 'zh'), null);
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

test('every readable extra field is checked, including notes and ingredients', () => {
  const extra = {
    name: 'Fresh fruit',
    native_name: '',
    kind: 'dessert' as const,
    note: '桂花糖藕，冷藏后食用。',
    estimated_cost_gbp: 1,
    ingredients: [
      { name: 'Lotus root', quantity: 1, unit: '个', from_pantry: false },
    ],
  };

  const noteViolation = findLanguageViolation(
    plan({ days: [{ day_index: 0, meals: [meal()], extras: [extra] }] }),
    'en'
  );
  assert.ok(noteViolation);
  assert.match(noteViolation.field, /extras\[0\]\.note/);

  extra.note = 'Serve chilled.';
  const unitViolation = findLanguageViolation(
    plan({ days: [{ day_index: 0, meals: [meal()], extras: [extra] }] }),
    'en'
  );
  assert.ok(unitViolation);
  assert.match(unitViolation.field, /extras\[0\]\.ingredients\[0\]\.unit/);
});

test('card checks ignore recipe-detail text that has not been translated yet', () => {
  const mixed = plan({
    days: [{ day_index: 0, meals: [meal({ steps: ['把鱼蒸十二分钟。'] })], extras: [] }],
  });

  assert.equal(findLanguageViolation(mixed, 'en', 'card'), null);
  assert.ok(findLanguageViolation(mixed, 'en', 'full'));
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

// --- The two fields the check did not know about -----------------------------
//
// Both were free text the model writes and the page renders, and neither was
// in the list. The visible result was an English plan reading "180克 Beef,
// thinly sliced" under a heading of "korean:全罗道" — every field anyone had
// thought of was covered, and the two nobody had thought of were the two that
// broke.

test('English requested, a Chinese unit is a violation', () => {
  const violation = findLanguageViolation(
    plan({
      days: [
        {
          day_index: 0,
          meals: [
            meal({
              ingredients: [
                // The name is correct English. Only the unit is wrong, which is
                // exactly why this slipped through: the check looked at
                // ingredient.name and stopped there.
                { name: 'Beef, thinly sliced', quantity: 180, unit: '克', from_pantry: false },
              ],
            }),
          ],
          extras: [],
        },
      ],
    } as Partial<GeneratedMealPlan>),
    'en'
  );

  assert.ok(violation, 'a Chinese unit passed the English language check');
  assert.match(violation.field, /unit/);
  assert.equal(violation.sample, '克');
});

test('English requested, a Chinese region is a violation', () => {
  const violation = findLanguageViolation(
    plan({
      days: [{ day_index: 0, meals: [meal({ region: '全罗道' })], extras: [] }],
    } as Partial<GeneratedMealPlan>),
    'en'
  );

  assert.ok(violation, 'a Chinese region passed the English language check');
  assert.match(violation.field, /region/);
});

test('a plan with English units and region still passes', () => {
  // The other direction. Widening the check is only useful if it does not start
  // rejecting correct plans — 'g' and 'Hunan' are what a good answer looks like.
  assert.equal(findLanguageViolation(plan(), 'en'), null);
});

test('a Chinese plan is not flagged for having Chinese units', () => {
  const zh = plan({
    summary: '一周七顿晚餐,尽量用上家里已有的食材。',
    waste_reduction_tip: '先用小葱,再用彩椒。',
    days: [
      {
        day_index: 0,
        meals: [
          meal({
            name: '剁椒鱼头',
            region: '湖南',
            steps: ['把鱼蒸十二分钟。'],
            ingredients: [{ name: '鲈鱼', quantity: 400, unit: '克', from_pantry: false }],
          }),
        ],
        extras: [],
      },
    ],
  } as Partial<GeneratedMealPlan>);

  assert.equal(findLanguageViolation(zh, 'zh'), null);
});
