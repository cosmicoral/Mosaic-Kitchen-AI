export interface User {
    id: string;
    email: string;
    created_at: Date;
}

// Null for accounts created through an OAuth provider, which have no password
// to compare against. Callers must handle that rather than assume a string.
export interface UserWithPassword extends User {
    password_hash: string | null;
}

export const OAUTH_PROVIDERS = ['google', 'apple'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export interface UserIdentity {
    id: string;
    user_id: string;
    provider: OAuthProvider;
    provider_user_id: string;
    email: string | null;
    created_at: Date;
    last_login_at: Date;
}

export interface Subscription {
    id: string;
    user_id: string;
    stripe_subscription_id: string;
    stripe_price_id: string;
    status: string;
    current_period_end: Date;
    cancel_at_period_end: boolean;
    created_at: Date;
    updated_at: Date;
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

export type AppErrorCode =
    | 'VALIDATION_ERROR'
    | 'EMAIL_TAKEN'
    | 'INVALID_CREDENTIALS'
    | 'NOT_FOUND'
    | 'PROFILE_REQUIRED'
    | 'QUOTA_EXCEEDED'
    | 'GENERATION_FAILED'
    | 'BILLING_ERROR'
    | 'ALREADY_SUBSCRIBED'
    | 'OAUTH_ERROR'
    | 'PASSWORD_LOGIN_UNAVAILABLE';

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

// The regions a household can narrow each cuisine down to. Stored namespaced
// ('chinese:sichuan') because "Northern" and "Central" name different places
// depending on the cuisine they belong to, and a flat list of bare slugs could
// not tell 'northern' Chinese from 'northern' Vietnamese apart.
export const CUISINE_REGIONS = {
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
  // `satisfies` rather than a plain annotation: it checks every key is a real
  // cuisine and that none is missing, while keeping the literal string types
  // so isCuisineRegion can narrow against them.
} as const satisfies Record<Cuisine, readonly string[]>;

export function isCuisineRegion(value: string): boolean {
  const [cuisine, region] = value.split(':');
  if (!cuisine || !region) return false;
  const regions = (CUISINE_REGIONS as Record<string, readonly string[]>)[cuisine];
  return Array.isArray(regions) && regions.includes(region);
}

// Planned alongside the meals rather than as extra meals, so they never
// disturb the meals_per_week count the household set.
export const EXTRA_KINDS = ['fruit', 'snack', 'dessert'] as const;
export type ExtraKind = (typeof EXTRA_KINDS)[number];

export const EXTRAS_FREQUENCIES = ['few', 'some', 'plenty'] as const;
export type ExtrasFrequency = (typeof EXTRAS_FREQUENCIES)[number];

// Deliberately named for the ingredients, not the outcome. "More protein" is
// something a meal planner can act on; "build muscle" is a claim about a
// person's body that this app cannot make good on and is not qualified to
// make. The same distinction keeps 'iron' and 'calcium' honest — they mean
// "favour ingredients that are good sources", not a promise about intake.
export const NUTRITION_FOCUSES = [
  'protein',
  'vegetables',
  'fibre',
  'iron',
  'calcium',
  'omega3',
  'light',
] as const;
export type NutritionFocus = (typeof NUTRITION_FOCUSES)[number];

export const SEASONING_INTENSITIES = ['light', 'balanced', 'bold'] as const;
export type SeasoningIntensity = (typeof SEASONING_INTENSITIES)[number];

// 麻 (numbing) is on this list because no Western meal planner models it, and
// for a Sichuan household it is the difference between the dish being right
// and being a chilli stir-fry.
export const FLAVOUR_NOTES = [
  'sour', 'sweet', 'bitter', 'spicy', 'umami', 'numbing', 'aromatic', 'smoky',
] as const;
export type FlavourNote = (typeof FLAVOUR_NOTES)[number];

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
  cuisine_regions: string[];
  seasoning_intensity: SeasoningIntensity | null;
  flavour_notes: FlavourNote[];
  low_salt: boolean;
  low_sugar: boolean;
  nutrition_focus: NutritionFocus[];
  include_extras: ExtraKind[];
  extras_frequency: ExtrasFrequency;
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
  cuisine_regions: string[];
  seasoning_intensity: SeasoningIntensity | null;
  flavour_notes: FlavourNote[];
  low_salt: boolean;
  low_sugar: boolean;
  nutrition_focus: NutritionFocus[];
  include_extras: ExtraKind[];
  extras_frequency: ExtrasFrequency;
  avoid_ingredients: string[];
  priorities: Priority[];
  cooking_style: CookingStyle | null;
  postcode: string | null;
}
