import pool from '../db/pool.ts';
import type { SupportedLocale } from '../utils/locale.ts';

export async function findMany(
  names: readonly string[],
  target: SupportedLocale
): Promise<Map<string, string>> {
  const lowered = names.map((name) => name.trim().toLowerCase());

  const result = await pool.query<{ source_text: string; gloss: string }>(
    `SELECT source_text, gloss
       FROM ingredient_glosses
      WHERE target_locale = $2 AND source_text = ANY($1)`,
    [lowered, target]
  );

  return new Map(result.rows.map((row) => [row.source_text, row.gloss]));
}

// ON CONFLICT DO NOTHING, not DO UPDATE: two requests can race on the same
// name, and the first answer is as good as the second. Overwriting would also
// silently replace a hand-corrected gloss with a model's next guess.
export async function saveMany(
  entries: ReadonlyArray<{ source: string; gloss: string }>,
  target: SupportedLocale,
  model: string
): Promise<void> {
  if (entries.length === 0) return;

  await pool.query(
    `INSERT INTO ingredient_glosses (source_text, target_locale, gloss, model)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
     ON CONFLICT (source_text, target_locale) DO NOTHING`,
    [
      entries.map((entry) => entry.source),
      entries.map(() => target),
      entries.map((entry) => entry.gloss),
      entries.map(() => model),
    ]
  );
}

export async function countGlosses(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*) FROM ingredient_glosses'
  );
  return Number(result.rows[0]?.count ?? 0);
}
