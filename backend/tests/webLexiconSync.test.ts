import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// The client carries a generated copy of the ingredient table so the pantry
// and shopping list can be *displayed* in the reader's language without a
// request. A second hand-maintained copy would drift the first time somebody
// added an entry to one of them; this makes the drift a failing test instead
// of a page that is half-translated for no visible reason.

const root = join(import.meta.dirname, '..');
const generated = join(root, '..', 'web', 'src', 'lib', 'ingredientLexicon.ts');

test('the generated web lexicon is up to date', () => {
  const before = readFileSync(generated, 'utf8');

  // Regenerating is the comparison: if the output differs from what is
  // committed, the source moved and the copy did not.
  execFileSync('node', ['scripts/generate-web-lexicon.ts'], { cwd: root });
  const after = readFileSync(generated, 'utf8');

  assert.equal(
    after,
    before,
    'web/src/lib/ingredientLexicon.ts is stale — run `npm run generate:lexicon` in backend/ and commit the result'
  );
});

test('the generated file says it is generated', () => {
  // Someone will open it and start editing otherwise, and their edit will
  // vanish the next time the generator runs.
  const source = readFileSync(generated, 'utf8');
  assert.match(source, /GENERATED FILE — do not edit/);
  assert.match(source, /npm run generate:lexicon/);
});
