import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Reads source rather than touching the database, so it runs anywhere and
// fails at `npm run test` rather than after an OpenAI call has been paid for.
//
// The bug this exists for: ai_usage has a CHECK constraint listing the valid
// feature keys, and 'pantry-cook' was added to the service without being added
// to the constraint. Nothing caught it — typecheck cannot see inside a SQL
// string, and the failure only appeared after a successful, billed model call,
// as a bare 500 with no clue in it. A constraint that code can drift away from
// silently needs something watching the gap.

const root = join(import.meta.dirname, '..');

function latestFeatureCheck(): string {
  const dir = join(root, 'migrations');
  // Migrations are timestamp-prefixed, so the last one to mention the
  // constraint is the one in force.
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  let current: string | null = null;
  for (const name of files) {
    const sql = readFileSync(join(dir, name), 'utf8');
    // Only the Up half. The Down half of this very migration restores the old,
    // narrower list, and reading that would make the test pass for the wrong
    // reason.
    const up = sql.split('-- Down Migration')[0] ?? '';
    const matches = [...up.matchAll(/feature IN \(([^)]*)\)/g)];
    const last = matches[matches.length - 1];
    if (last?.[1]) current = last[1];
  }

  assert.ok(current, 'no ai_usage feature CHECK found in migrations');
  return current;
}

function featureKeysUsedInCode(): string[] {
  const keys = new Set<string>();

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;

      const source = readFileSync(path, 'utf8');
      // Both the write and the read: recording under a key the constraint
      // rejects is one bug, counting a quota under a key nothing writes is the
      // other, and both are invisible until someone hits them.
      for (const match of source.matchAll(/feature: '([a-z-]+)'/g)) {
        if (match[1]) keys.add(match[1]);
      }
      for (const match of source.matchAll(
        /countSuccessfulThisMonth\(\s*[^,]+,\s*'([a-z-]+)'/g
      )) {
        if (match[1]) keys.add(match[1]);
      }
    }
  }

  walk(join(root, 'src'));
  return [...keys].sort();
}

test('every ai_usage feature key the code writes is allowed by the CHECK constraint', () => {
  const allowed = new Set(
    latestFeatureCheck()
      .split(',')
      .map((entry) => entry.trim().replace(/^'|'$/g, ''))
  );

  const used = featureKeysUsedInCode();
  assert.ok(used.length > 0, 'found no feature keys in src — the regex has rotted');

  for (const key of used) {
    assert.ok(
      allowed.has(key),
      `src uses ai_usage feature '${key}', but the CHECK constraint only allows ${[...allowed]
        .map((entry) => `'${entry}'`)
        .join(', ')}. Add a migration widening the constraint.`
    );
  }
});
