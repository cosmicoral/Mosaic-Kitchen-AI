// The wire format, not the database row: JSON has no date type, so what the
// API sends is an ISO string.
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export const PANTRY_CATEGORIES = [
  'vegetables',
  'protein',
  'grains',
  'condiments',
  'frozen',
  'dairy',
  'other',
] as const;

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  category: PantryCategory;
  quantity: string | null;
  unit: string | null;
  expires_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface PantryItemInput {
  name: string;
  category: PantryCategory;
  quantity: number | null;
  unit: string | null;
  expires_on: string | null;
}