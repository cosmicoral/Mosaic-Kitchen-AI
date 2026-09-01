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

export const CUISINES = [
  'chinese', 'british', 'indian', 'pakistani', 'middle-eastern',
  'japanese', 'korean', 'thai', 'vietnamese', 'italian',
  'mexican', 'caribbean', 'west-african', 'mediterranean',
] as const;

export type Cuisine = (typeof CUISINES)[number];

export const COOKING_STYLES = ['quick', 'balanced', 'batch', 'relaxed'] as const;
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
  avoid_ingredients: string[];
  priorities: Priority[];
  cooking_style: CookingStyle | null;
  postcode: string | null;
  created_at: string;
  updated_at: string;
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

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export interface GeneratedIngredient {
  name: string;
  quantity: number;
  unit: string;
  from_pantry: boolean;
}

export interface GeneratedMeal {
  slot: MealSlot;
  name: string;
  cuisine: string;
  minutes: number;
  servings: number;
  estimated_cost_gbp: number;
  ingredients: GeneratedIngredient[];
  steps: string[];
}

export interface GeneratedDay {
  day_index: number;
  meals: GeneratedMeal[];
}

export interface GeneratedMealPlan {
  summary: string;
  days: GeneratedDay[];
  estimated_total_gbp: number;
  waste_reduction_tip: string;
}

export interface MealPlanRecord {
  id: string;
  user_id: string;
  starts_on: string;
  plan: GeneratedMealPlan;
  profile_snapshot: UserProfile;
  created_at: string;
}

export interface MealPlanQuota {
  used: number;
  limit: number;
  remaining: number;
}