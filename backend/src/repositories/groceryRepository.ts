import pool from '../db/pool.ts';

export interface AvailabilityRow {
  matched_alias: string;
  canonical_en: string;
  availability: 'common' | 'seasonal' | 'specialist';
  store_class_id: string;
  substitutes: Array<{ name: string; closeness: number; note: string | null }>;
}

/**
 * Looks names up through the alias table and resolves availability for a
 * region, inheriting from the region's parent.
 *
 * Matching is on `lower(alias)` against an index of the same expression, and
 * exact — no trigram, no similarity. The lexicon makes the same choice for the
 * same reason: a near-match here puts the wrong vegetable on a shopping list,
 * and a miss is recoverable while a confident error is not.
 *
 * The region fallback is a recursive CTE rather than two queries, so
 * 'uk-london' inherits everything true of 'uk' without either restating it or
 * needing the caller to know the hierarchy. `DISTINCT ON` then keeps the most
 * specific row: ordering by depth puts the region's own entry ahead of its
 * parent's.
 */
export async function findAvailability(
  names: readonly string[],
  region: string
): Promise<Map<string, AvailabilityRow>> {
  const lowered = names.map((name) => name.trim().toLowerCase());

  const result = await pool.query<AvailabilityRow>(
    `WITH RECURSIVE region_chain AS (
       SELECT id, parent_id, 0 AS depth
         FROM grocery_regions
        WHERE id = $2
       UNION ALL
       SELECT r.id, r.parent_id, rc.depth + 1
         FROM grocery_regions r
         JOIN region_chain rc ON r.id = rc.parent_id
     ),
     matched AS (
       SELECT DISTINCT ON (a.alias_lower, i.id)
              a.alias_lower AS matched_alias,
              i.id          AS item_id,
              i.canonical_en,
              av.availability,
              av.store_class_id,
              rc.depth
         FROM (
                SELECT grocery_item_id, lower(alias) AS alias_lower
                  FROM grocery_item_aliases
                 UNION
                SELECT id, lower(canonical_en) FROM grocery_items
                 UNION
                SELECT id, lower(canonical_zh) FROM grocery_items
                 WHERE canonical_zh IS NOT NULL
              ) a
         JOIN grocery_items i        ON i.id = a.grocery_item_id
         JOIN grocery_availability av ON av.grocery_item_id = i.id
         JOIN region_chain rc         ON rc.id = av.region_id
        WHERE a.alias_lower = ANY($1)
        ORDER BY a.alias_lower, i.id, rc.depth, av.store_class_id
     )
     SELECT m.matched_alias,
            m.canonical_en,
            m.availability,
            m.store_class_id,
            coalesce(
              (SELECT json_agg(json_build_object(
                        'name', si.canonical_en,
                        'closeness', s.closeness,
                        'note', s.note
                      ) ORDER BY s.closeness)
                 FROM grocery_substitutions s
                 JOIN grocery_items si ON si.id = s.substitute_item_id
                WHERE s.grocery_item_id = m.item_id
                  AND (s.region_id IS NULL OR s.region_id IN (SELECT id FROM region_chain))),
              '[]'::json
            ) AS substitutes
       FROM matched m`,
    [lowered, region]
  );

  return new Map(result.rows.map((row) => [row.matched_alias, row]));
}

export async function countItems(): Promise<number> {
  const result = await pool.query<{ count: string }>('SELECT count(*) FROM grocery_items');
  return Number(result.rows[0]?.count ?? 0);
}

export async function countAvailability(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*) FROM grocery_availability'
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function countSubstitutions(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*) FROM grocery_substitutions'
  );
  return Number(result.rows[0]?.count ?? 0);
}
