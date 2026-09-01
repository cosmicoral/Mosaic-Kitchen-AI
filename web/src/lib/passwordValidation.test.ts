import { describe, expect, test } from 'vitest';
import { isStrongPassword, passwordRequirements } from './passwordValidation';

describe('password validation', () => {
  test('accepts a password meeting every signup requirement', () => {
    expect(isStrongPassword('MosaicKitchen1!')).toBe(true);
    expect(passwordRequirements('MosaicKitchen1!').every(({ met }) => met)).toBe(true);
  });

  test.each([
    ['Short1!', false],
    ['mosaickitchen1!', false],
    ['MOSAICKITCHEN1!', false],
    ['MosaicKitchen!', false],
    ['MosaicKitchen1', false],
  ])('rejects %s when one requirement is missing', (password, expected) => {
    expect(isStrongPassword(password)).toBe(expected);
  });

  test('does not treat whitespace as a special character', () => {
    expect(isStrongPassword('Mosaic Kitchen1')).toBe(false);
  });
});
