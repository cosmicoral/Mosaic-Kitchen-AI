import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { CUISINES, CUISINE_SUBSTYLES, isCuisineRegion } from '../src/types/index.ts';
import { SUBSTYLE_LABELS } from '../src/utils/promptBuilder.ts';

// Four lists describe the cuisine taxonomy and they live in four files:
//
//   backend/src/types/index.ts        the validation whitelist
//   backend/src/utils/promptBuilder   the labels the model is told
//   web/src/types/index.ts            what the picker offers
//   web/src/lib/profileOptions.ts     what the picker calls things
//
// When the taxonomy was revised — Japanese and Korean moved from pure geography
// to culinary styles — three of the four were updated and the whitelist was
// not. The result: thirteen styles offered in the interface and refused by the
// API with "cuisine_substyles contains an unknown value: korean:bbq". Nothing
// caught it, because nothing had ever compared the lists.
//
// That is the actual defect. A single missing value is a typo; four hand-kept
// copies of one fact is a design that will keep producing typos. These tests
// are the thing that makes them one fact again.

const web = join(import.meta.dirname, '..', '..', 'web', 'src');

/** Parses `key: ['a', 'b']` pairs out of an exported object literal. */
function parseListMap(file: string, marker: string): Record<string, string[]> {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf(marker);
  assert.ok(start > -1, `${marker} not found in ${file} — has it been renamed?`);

  const body = source.slice(start, source.indexOf('\n}', start));
  const out: Record<string, string[]> = {};

  for (const match of body.matchAll(/^\s*'?([a-z-]+)'?:\s*\[([^\]]*)\]/gms)) {
    out[match[1]!] = [...match[2]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  }

  return out;
}

describe('the cuisine taxonomy is one fact, not four', () => {
  const frontend = parseListMap(join(web, 'types', 'index.ts'), 'export const CUISINE_SUBSTYLES');

  test('the picker offers exactly what the API accepts', () => {
    assert.ok(
      Object.keys(frontend).length > 0,
      'parsed no substyles from the web types — the parser has rotted'
    );

    for (const cuisine of CUISINES) {
      const offered = frontend[cuisine] ?? [];
      const accepted = CUISINE_SUBSTYLES[cuisine] as readonly string[];

      const refused = offered.filter((value) => !accepted.includes(value));
      const hidden = accepted.filter((value) => !offered.includes(value));

      assert.deepEqual(
        refused,
        [],
        `${cuisine}: the picker offers ${refused.join(', ')}, which the API refuses. ` +
          'A user who selects one cannot save their profile.'
      );
      assert.deepEqual(
        hidden,
        [],
        `${cuisine}: the API accepts ${hidden.join(', ')} but nothing offers it. ` +
          'Either add it to the picker or drop it.'
      );
    }
  });

  test('every accepted substyle survives its own validator', () => {
    // isCuisineRegion is what profileService actually calls. Reading the table
    // directly and asserting against it would pass even if the validator were
    // looking somewhere else entirely.
    for (const cuisine of CUISINES) {
      for (const substyle of CUISINE_SUBSTYLES[cuisine] as readonly string[]) {
        assert.ok(
          isCuisineRegion(`${cuisine}:${substyle}`),
          `${cuisine}:${substyle} is in the whitelist but isCuisineRegion rejects it`
        );
      }
    }
  });

  test('the specific values that were broken now work', () => {
    // Named individually rather than left to the loop above. These are what a
    // person clicked and could not save, and a regression on exactly these is
    // worth failing by name.
    for (const value of [
      'korean:bbq',
      'korean:home-korean',
      'korean:soups-stews',
      'korean:bibimbap',
      'korean:korean-noodles',
      'korean:street-food',
      'korean:royal-court',
      'korean:temple',
      'japanese:washoku',
      'japanese:izakaya',
      'japanese:ramen',
      'japanese:sushi',
      'japanese:yakitori',
    ]) {
      assert.ok(isCuisineRegion(value), `${value} is still refused`);
    }
  });

  test('every substyle has a label for the prompt', () => {
    // A missing label does not throw. The prompt just describes the style by
    // its slug — "cook in the home-korean style" — which is a worse prompt that
    // still produces a plausible-looking plan, so nobody ever finds out.
    for (const cuisine of CUISINES) {
      for (const substyle of CUISINE_SUBSTYLES[cuisine] as readonly string[]) {
        assert.ok(
          SUBSTYLE_LABELS[substyle],
          `${cuisine}:${substyle} has no entry in promptBuilder's SUBSTYLE_LABELS`
        );
      }
    }
  });

  test('every substyle has a label for the interface', () => {
    const labels = readFileSync(join(web, 'lib', 'profileOptions.ts'), 'utf8');

    for (const cuisine of CUISINES) {
      for (const substyle of CUISINE_SUBSTYLES[cuisine] as readonly string[]) {
        assert.match(
          labels,
          new RegExp(`'?${substyle}'?\\s*:`),
          `${cuisine}:${substyle} has no entry in the web SUBSTYLE_LABELS, so the ` +
            'picker would show a raw slug'
        );
      }
    }
  });
});
