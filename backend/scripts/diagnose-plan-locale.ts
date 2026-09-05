import pool from '../src/db/pool.ts';

// Answers one question and nothing else: does the database agree with the
// text it is storing? A plan whose rows say 'en' while its summary is Chinese
// is never a mismatch, so it is never translated, so the language toggle looks
// broken with nothing reporting an error.
const { rows } = await pool.query<{
  id: string;
  locale: string;
  looks_like: string;
  summary: string;
  translations: string;
}>(`
  SELECT mp.id,
         mp.locale,
         CASE WHEN mp.plan->>'summary' ~ '[一-鿿぀-ヿ가-힯]' THEN 'zh' ELSE 'en' END AS looks_like,
         left(mp.plan->>'summary', 40) AS summary,
         coalesce(
           (SELECT string_agg(t.locale, ', ' ORDER BY t.locale)
              FROM meal_plan_translations t
             WHERE t.meal_plan_id = mp.id),
           '-'
         ) AS translations
    FROM meal_plans mp
   ORDER BY mp.created_at DESC
   LIMIT 10
`);

console.table(
  rows.map((row) => ({
    id: row.id.slice(0, 8),
    locale_column: row.locale,
    text_looks_like: row.looks_like,
    agrees: row.locale === row.looks_like ? 'yes' : 'NO — backfill not run',
    cached_translations: row.translations,
    summary: row.summary,
  }))
);

await pool.end();
