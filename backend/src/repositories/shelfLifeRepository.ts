import pool from '../db/pool.ts';

export type DateKind = 'use_by' | 'best_before';
export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

export interface ShelfLifeClass {
  id: string;
  label: string;
  date_kind: DateKind;
  fridge_days: number | null;
  freezer_days: number | null;
  pantry_days: number | null;
  source: string;
  note: string | null;
}

const COLUMNS = `id, label, date_kind, fridge_days, freezer_days, pantry_days, source, note`;

// Cached for the process lifetime. Roughly forty rows that change only when a
// migration changes them, read on every pantry insert — a query per item would
// be a round trip to Neon for a constant.
let cache: Map<string, ShelfLifeClass> | null = null;

export async function all(): Promise<Map<string, ShelfLifeClass>> {
  if (cache) return cache;

  const result = await pool.query<ShelfLifeClass>(
    `SELECT ${COLUMNS} FROM shelf_life_classes ORDER BY id`
  );

  cache = new Map(result.rows.map((row) => [row.id, row]));
  return cache;
}

export async function findById(id: string): Promise<ShelfLifeClass | null> {
  return (await all()).get(id) ?? null;
}

export async function ids(): Promise<string[]> {
  return [...(await all()).keys()];
}

// Exposed for tests, which seed and clear the table between runs.
export function clearCache(): void {
  cache = null;
}
