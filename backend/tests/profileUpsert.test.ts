import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Reads the SQL rather than hitting a database, so it runs in a second and
// catches the failure at the point it is cheapest to catch.
//
// This exists because of a real bug: include_extras and extras_frequency were
// added to the column list and the VALUES clause but not to the
// ON CONFLICT DO UPDATE SET clause. Inserting a fresh profile worked, so it
// looked correct in every test that created one — and every user who already
// had a profile silently lost those two fields on every save.
const SOURCE = new URL('../src/repositories/profileRepository.ts', import.meta.url);

// Not derived from UserProfileInput's keys: this list is the point of the
// test, and generating it from the same place the code reads would let both
// drift together.
const UPDATABLE_COLUMNS = [
  'adults',
  'teenagers',
  'children',
  'toddlers',
  'meals_per_week',
  'weekly_budget',
  'cuisines',
  'cuisine_regions',
  'seasoning_intensity',
  'flavour_notes',
  'low_salt',
  'low_sugar',
  'nutrition_focus',
  'include_extras',
  'extras_frequency',
  'avoid_ingredients',
  'priorities',
  'cooking_style',
  'postcode',
];

describe('profile upsert SQL', () => {
  test('every profile column is written on insert and on update', async () => {
    const sql = await readFile(SOURCE, 'utf8');

    const insertClause = sql.slice(
      sql.indexOf('INSERT INTO user_profiles'),
      sql.indexOf('ON CONFLICT')
    );
    const updateClause = sql.slice(
      sql.indexOf('ON CONFLICT'),
      sql.indexOf('RETURNING')
    );

    for (const column of UPDATABLE_COLUMNS) {
      assert.match(
        insertClause,
        new RegExp(`\\b${column}\\b`),
        `${column} is missing from the INSERT column list`
      );
      assert.match(
        updateClause,
        new RegExp(`${column}\\s*=\\s*EXCLUDED\\.${column}`),
        `${column} is missing from ON CONFLICT DO UPDATE — it will save on a ` +
          `new profile and be silently ignored on every later save`
      );
    }
  });

  test('the placeholder count matches the number of inserted columns', async () => {
    const sql = await readFile(SOURCE, 'utf8');

    const values = sql.slice(sql.indexOf('VALUES ('), sql.indexOf('ON CONFLICT'));
    const placeholders = new Set(values.match(/\$\d+/g) ?? []);

    // user_id plus every updatable column.
    assert.equal(placeholders.size, UPDATABLE_COLUMNS.length + 1);
  });
});
