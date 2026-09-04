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

// Mirrors the backend catalogue. Values are stored namespaced as
// 'chinese:sichuan', because "Northern" and "Central" name different places in
// different cuisines and a bare slug could not tell them apart.
export const CUISINE_REGIONS: Record<Cuisine, readonly string[]> = {
  chinese: ['sichuan', 'cantonese', 'hunan', 'jiangnan', 'northern', 'dongbei', 'fujian', 'yunnan', 'xinjiang', 'hakka'],
  japanese: ['kanto', 'kansai', 'kyushu', 'hokkaido', 'tohoku', 'okinawa'],
  korean: ['seoul', 'jeolla', 'gyeongsang', 'gangwon', 'jeju'],
  indian: ['punjabi', 'gujarati', 'bengali', 'tamil', 'kerala', 'maharashtrian', 'rajasthani', 'hyderabadi'],
  pakistani: ['punjabi', 'sindhi', 'pashtun', 'kashmiri'],
  'middle-eastern': ['levantine', 'iraqi', 'persian', 'egyptian', 'yemeni', 'palestinian'],
  thai: ['central', 'isan', 'lanna', 'southern'],
  vietnamese: ['northern', 'hue', 'mekong'],
  british: ['english', 'scottish', 'welsh', 'northern-irish'],
  italian: ['roman', 'neapolitan', 'sicilian', 'emilian', 'ligurian', 'tuscan', 'puglian'],
  mexican: ['oaxacan', 'yucatecan', 'poblano', 'norteno', 'veracruz'],
  caribbean: ['jamaican', 'trinidadian', 'bajan', 'guyanese', 'haitian'],
  'west-african': ['nigerian', 'ghanaian', 'senegalese', 'ivorian', 'sierra-leonean'],
  mediterranean: ['greek', 'turkish', 'levantine', 'spanish', 'cypriot', 'maltese'],
};

export const EXTRA_KINDS = ['fruit', 'snack', 'dessert'] as const;
export type ExtraKind = (typeof EXTRA_KINDS)[number];

export const EXTRAS_FREQUENCIES = ['few', 'some', 'plenty'] as const;
export type ExtrasFrequency = (typeof EXTRAS_FREQUENCIES)[number];

export const SEASONING_INTENSITIES = ['light', 'balanced', 'bold'] as const;
export type SeasoningIntensity = (typeof SEASONING_INTENSITIES)[number];

export const FLAVOUR_NOTES = [
  'sour', 'sweet', 'bitter', 'spicy', 'umami', 'numbing', 'aromatic', 'smoky',
] as const;
export type FlavourNote = (typeof FLAVOUR_NOTES)[number];

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
  cuisine_regions: string[];
  seasoning_intensity: SeasoningIntensity | null;
  flavour_notes: FlavourNote[];
  low_salt: boolean;
  low_sugar: boolean;
  include_extras: ExtraKind[];
  extras_frequency: ExtrasFrequency;
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
  cuisine_regions: string[];
  seasoning_intensity: SeasoningIntensity | null;
  flavour_notes: FlavourNote[];
  low_salt: boolean;
  low_sugar: boolean;
  include_extras: ExtraKind[];
  extras_frequency: ExtrasFrequency;
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
  // Optional while plans created before the cuisine-accuracy release remain
  // in JSONB without this field.
  native_name?: string;
  cuisine: string;
  // Optional for the same reason: plans stored before regions existed do not
  // carry it, and a stored plan is never migrated.
  region?: string;
  minutes: number;
  servings: number;
  estimated_cost_gbp: number;
  ingredients: GeneratedIngredient[];
  steps: string[];
}

export interface GeneratedExtra {
  kind: ExtraKind;
  name: string;
  native_name: string;
  note: string;
  estimated_cost_gbp: number;
  ingredients: GeneratedIngredient[];
}

export interface GeneratedDay {
  day_index: number;
  meals: GeneratedMeal[];
  // Optional on the wire: plans generated before extras existed have no such
  // field, and a stored plan is never migrated.
  extras?: GeneratedExtra[];
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
  // Travels with the quota so a screen showing "3 plans left" can also say
  // which plan that allowance belongs to, without a second request.
  tier: Tier;
  used: number;
  limit: number;
  remaining: number;
}

export const TIERS = ['free', 'plus', 'pro'] as const;
export type Tier = (typeof TIERS)[number];
export type PaidTier = Exclude<Tier, 'free'>;

export interface Entitlements {
  householdMembers: number;
  mealPlansPerMonth: number;
  maxMealsPerPlan: number;
  scansPerMonth: number;
}

// Price ids come from the API rather than from a VITE_ variable, so there is
// only ever one list of them and the pricing page cannot drift out of step
// with what the server will accept at checkout.
export interface PlanRef {
  tier: PaidTier;
  interval: 'month' | 'year';
  price_id: string;
}

export interface PlansResponse {
  plans: PlanRef[];
  entitlements: Record<Tier, Entitlements>;
}

export interface BillingStatus {
  tier: Tier;
  entitlements: Entitlements;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface ShoppingListItem {
  id: string;
  user_id: string;
  meal_plan_id: string | null;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: PantryCategory;
  is_checked: boolean;
  source: 'plan' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItemInput {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: PantryCategory;
}
