import { describe, expect, test } from 'vitest';
import type { GeneratedMealPlan } from '../types';
import {
  generatedPlanMismatchesLocale,
  generatedTextOrFallback,
  labelMonogram,
} from './textLocale';

function plan(mealName: string, step: string): GeneratedMealPlan {
  return {
    summary: '一周家常餐单。',
    estimated_total_gbp: 5,
    waste_reduction_tip: '先用容易变质的蔬菜。',
    days: [{
      day_index: 0,
      extras: [],
      meals: [{
        slot: 'dinner',
        name: mealName,
        native_name: '고등어구이',
        cuisine: 'korean',
        region: '全罗道',
        minutes: 30,
        servings: 2,
        estimated_cost_gbp: 5,
        ingredients: [
          { name: 'Mackerel', quantity: 1, unit: 'g', from_pantry: false },
        ],
        steps: [step],
      }],
    }],
  };
}

describe('generatedTextOrFallback', () => {
  test('does not expose a CJK region label in the English interface', () => {
    expect(generatedTextOrFallback('全罗道', 'en', 'Korean')).toBe('Korean');
    expect(generatedTextOrFallback('전라도', 'en', 'Korean')).toBe('Korean');
  });

  test('keeps text that matches the selected interface language', () => {
    expect(generatedTextOrFallback('Jeolla', 'en', 'Korean')).toBe('Jeolla');
    expect(generatedTextOrFallback('全罗道', 'zh', '韩国菜')).toBe('全罗道');
  });

  test('does not expose an English AI label in the Chinese interface', () => {
    expect(generatedTextOrFallback('Jeolla', 'zh', '韩餐')).toBe('韩餐');
    expect(generatedTextOrFallback('Jeolla-style grilled mackerel', 'zh', '韩餐')).toBe('韩餐');
    expect(generatedTextOrFallback('전라도', 'zh', '韩餐')).toBe('韩餐');
  });
});

describe('labelMonogram', () => {
  test('creates deterministic dashboard badges without depending on raw regions', () => {
    expect(labelMonogram('Korean')).toBe('KO');
    expect(labelMonogram('韩国菜')).toBe('韩国');
  });
});

describe('generatedPlanMismatchesLocale', () => {
  test('checks each Chinese field instead of accepting one Chinese summary', () => {
    expect(
      generatedPlanMismatchesLocale(
        plan('Jeolla-style grilled mackerel', '把鲭鱼煎至金黄。'),
        'zh',
        'card'
      )
    ).toBe(true);
  });

  test('checks recipe detail before it is revealed', () => {
    const mixed = plan('全罗道烤鲭鱼', 'Pan-fry the mackerel until golden.');
    expect(generatedPlanMismatchesLocale(mixed, 'zh', 'card')).toBe(false);
    expect(generatedPlanMismatchesLocale(mixed, 'zh', 'full')).toBe(true);
  });

  test('judges ingredients and units as they will actually be rendered', () => {
    const chinese = plan('全罗道烤鲭鱼', '把鲭鱼煎至金黄。');
    expect(generatedPlanMismatchesLocale(chinese, 'zh', 'full')).toBe(false);
  });
});
