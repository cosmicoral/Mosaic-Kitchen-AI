import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { retrievalEnabled } from '../src/services/retrieval.ts';

// The knowledge base is schema without a corpus. The risk of landing it early
// is not that it breaks anything — it is that it quietly stops being off, or
// that somebody wires it into generation before there is anything to retrieve
// and the plans get worse for reasons nobody can see.

const src = join(import.meta.dirname, '..', 'src');

function read(...parts: string[]): string {
  return readFileSync(join(src, ...parts), 'utf8');
}

test('retrieval is off unless the flag is explicitly set', () => {
  const before = process.env.RETRIEVAL_ENABLED;
  try {
    delete process.env.RETRIEVAL_ENABLED;
    assert.equal(retrievalEnabled(), false, 'unset should be off');

    process.env.RETRIEVAL_ENABLED = '1';
    assert.equal(retrievalEnabled(), false, "only the string 'true' enables it");

    process.env.RETRIEVAL_ENABLED = 'true';
    assert.equal(retrievalEnabled(), true);
  } finally {
    if (before === undefined) delete process.env.RETRIEVAL_ENABLED;
    else process.env.RETRIEVAL_ENABLED = before;
  }
});

test('retrieval returns nothing rather than throwing while it is off', async () => {
  const before = process.env.RETRIEVAL_ENABLED;
  delete process.env.RETRIEVAL_ENABLED;

  try {
    const { retrieve } = await import('../src/services/retrieval.ts');
    // No database call either — the flag short-circuits before the count.
    assert.deepEqual(await retrieve('anything'), []);
  } finally {
    if (before !== undefined) process.env.RETRIEVAL_ENABLED = before;
  }
});

test('generation does not consult the knowledge base or the catalogue', () => {
  // The claim the README makes: plans behave identically with retrieval on or
  // off. This is what makes that true, and it is worth asserting because the
  // day somebody wires it in is the day the claim silently stops holding.
  for (const file of ['services/mealPlanService.ts', 'utils/promptBuilder.ts']) {
    const source = read(...file.split('/'));
    for (const forbidden of ['retrieval', 'knowledgeRepository', 'groceryAvailability']) {
      assert.ok(
        !source.includes(forbidden),
        `${file} references ${forbidden} — update the README and docs/rag.md before wiring it in`
      );
    }
  }
});

test('the vector column and the embedding model agree on dimensions', () => {
  // 1536 in the migration and 1536 in the service. A mismatch would be found
  // by the first INSERT, in production, after an embedding had been paid for.
  const migrations = join(import.meta.dirname, '..', 'migrations');
  const knowledge = readdirSync(migrations)
    .filter((name) => name.includes('knowledge'))
    .map((name) => readFileSync(join(migrations, name), 'utf8'))
    .join('\n');

  const column = /VECTOR\((\d+)\)/.exec(knowledge);
  assert.ok(column, 'no VECTOR(n) column found in the knowledge migration');

  const service = read('services', 'retrieval.ts');
  const declared = /EMBEDDING_DIMENSIONS = (\d+)/.exec(service);
  assert.ok(declared);

  assert.equal(
    column[1],
    declared[1],
    'the vector column and EMBEDDING_DIMENSIONS disagree'
  );
});

test('availability failing open is stated where it is implemented', () => {
  // Not a behavioural test — the catalogue is empty, so behaviour would prove
  // nothing. This asserts the reasoning is recorded next to the code, because
  // "unknown means permitted" is the kind of decision someone reverses in six
  // months without realising it is deliberate.
  const source = read('services', 'groceryAvailability.ts');
  assert.match(source, /Fails OPEN/);
  assert.match(source, /opposite of the allergen check/);
});
