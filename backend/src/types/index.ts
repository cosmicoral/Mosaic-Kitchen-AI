export interface User {
    id: string;
    email: string;
    created_at: Date;
}

export interface UserWithPassword extends User {
    password_hash: string;
}

export interface Session {
    id: string;
    user_id: string;
    expires_at: Date;
}

export interface SessionWithUser {
    session_id: string;
    expires_at: Date;
    user_id: string;
    email: string;
    user_created_at: Date;
}

export type AppErrorCode = 'VALIDATION_ERROR' | 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS'| 'NOT_FOUND';

export class AppError extends Error {
    code: AppErrorCode;
    constructor(message: string, code: AppErrorCode) {
        super(message);
        this.code = code;
    }
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
    created_at: Date;
    updated_at: Date;
}

export interface PantryItemInput {
    name: string;
    category: PantryCategory;
    quantity: number | null;
    unit: string | null;
    expires_on: string | null;
}

export type PantryItemPatch = Partial<PantryItemInput>;

// Drives RAG retrieval later, so it has to match the tags on the recipe
// corpus — that is why this is a closed list rather than free text.
export const CUISINES = [
  'chinese', 'british', 'indian', 'pakistani', 'middle-eastern',
  'japanese', 'korean', 'thai', 'vietnamese', 'italian',
  'mexican', 'caribbean', 'west-african', 'mediterranean',
] as const;

export type Cuisine = (typeof CUISINES)[number];

export const COOKING_STYLES = [
  'quick',      // under 25 minutes
  'balanced',   // 30-45 minutes
  'batch',      // cook once, eat several times
  'relaxed',    // happy to spend an hour
] as const;

export type CookingStyle = (typeof COOKING_STYLES)[number];

export const PRIORITIES = [
  'budget', 'health', 'taste', 'convenience',
  'waste-reduction', 'cultural-authenticity',
] as const;

export type Priority = (typeof PRIORITIES)[number];

export interface UserProfile {
  user_id: string;
  adults: number;
  teenagers: number;
  children: number;
  toddlers: number;
  household_size: number;
  meals_per_week: number;
  weekly_budget: string | null;
  cuisines: Cuisine[];
  // Free text on purpose: a closed list cannot cover every allergy or dislike,
  // and getting this wrong is a safety problem, not a taste one.
  avoid_ingredients: string[];
  priorities: Priority[];
  cooking_style: CookingStyle | null;
  postcode: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfileInput {
  adults: number;
  teenagers: number;
  children: number;
  toddlers: number;
  meals_per_week: number;
  weekly_budget: number | null;
  cuisines: Cuisine[];
  avoid_ingredients: string[];
  priorities: Priority[];
  cooking_style: CookingStyle | null;
  postcode: string | null;
}