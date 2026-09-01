import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import * as profileService from '../src/services/profileService.ts';
import { AppError } from '../src/types/index.ts';

const VALID_PROFILE = {
  adults: 1,
  teenagers: 0,
  children: 0,
  toddlers: 0,
  meals_per_week: 7,
  weekly_budget: 80,
  cuisines: ['chinese'],
  avoid_ingredients: [],
  priorities: ['cultural-authenticity'],
  cooking_style: 'balanced',
  postcode: null,
};

describe('profileService cuisine validation', () => {
  test('rejects a profile without a cuisine before writing to the database', async () => {
    await assert.rejects(
      () => profileService.saveProfile('00000000-0000-0000-0000-000000000000', {
        ...VALID_PROFILE,
        cuisines: [],
      }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'VALIDATION_ERROR');
        assert.match(error.message, /at least one cuisine/i);
        return true;
      }
    );
  });
});
