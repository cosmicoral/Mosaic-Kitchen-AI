import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readLocale } from '../src/utils/locale.ts';
import { buildMealPlanPrompt } from '../src/utils/promptBuilder.ts';
import type { UserProfile } from '../src/types/index.ts';
import { localizedSystemPrompt } from '../src/services/mealPlanService.ts';

describe('readLocale', () => {
  test('recognises common Chinese Accept-Language values', () => {
    assert.equal(readLocale('zh-CN,zh;q=0.9,en;q=0.8'), 'zh');
    assert.equal(readLocale('zh-TW'), 'zh');
  });

  test('defaults unsupported or missing languages to English', () => {
    assert.equal(readLocale('fr-FR'), 'en');
    assert.equal(readLocale(undefined), 'en');
  });
});

describe('Chinese meal-plan prompts', () => {
  test('adds a Chinese output rule to the model system prompt', () => {
    const prompt = localizedSystemPrompt('zh');
    assert.match(prompt, /Simplified Chinese/);
    assert.match(prompt, /JSON keys and enum values must remain exactly/);
  });

  test('asks for Chinese values while preserving the JSON schema language', () => {
    const profile: UserProfile = {
      user_id: '00000000-0000-0000-0000-000000000000',
      adults: 2, teenagers: 0, children: 0, toddlers: 0,
      household_size: 2, meals_per_week: 3, weekly_budget: '50.00',
      cuisines: ['chinese'], avoid_ingredients: ['花生'], priorities: ['budget'],
      cooking_style: 'quick', postcode: null,
      created_at: new Date(), updated_at: new Date(),
    };

    const prompt = buildMealPlanPrompt(profile, [], 'zh');
    assert.match(prompt, /Simplified Chinese/);
    assert.match(prompt, /JSON keys and schema enum values in English/);
    assert.match(prompt, /花生/);
  });
});
