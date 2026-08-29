import { COOKING_STYLES, CUISINES, PRIORITIES } from '../types';
import type { CookingStyle, Cuisine, Priority } from '../types';

// The database stores machine-readable values; these are what a person reads.
// Keeping the two apart means the wording can change without a migration.
export const CUISINE_LABELS: Record<Cuisine, string> = {
  chinese: 'Chinese',
  british: 'British',
  indian: 'Indian',
  pakistani: 'Pakistani',
  'middle-eastern': 'Middle Eastern',
  japanese: 'Japanese',
  korean: 'Korean',
  thai: 'Thai',
  vietnamese: 'Vietnamese',
  italian: 'Italian',
  mexican: 'Mexican',
  caribbean: 'Caribbean',
  'west-african': 'West African',
  mediterranean: 'Mediterranean',
};

export const COOKING_STYLE_LABELS: Record<CookingStyle, string> = {
  quick: 'Quick meals',
  balanced: 'Balanced',
  batch: 'Batch cooking',
  relaxed: 'Take my time',
};

export const COOKING_STYLE_HINTS: Record<CookingStyle, string> = {
  quick: 'Under 25 minutes',
  balanced: '30 to 45 minutes',
  batch: 'Cook once, eat several times',
  relaxed: 'Happy to spend an hour',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  budget: 'Budget',
  health: 'Health',
  taste: 'Taste',
  convenience: 'Convenience',
  'waste-reduction': 'Less waste',
  'cultural-authenticity': 'Cultural authenticity',
};

// Shortcuts for the most common exclusions. Free text stays available, because
// a fixed list cannot cover every allergy — the list is a convenience, not a
// constraint.
export const COMMON_AVOIDANCES = [
  'pork', 'beef', 'alcohol', 'shellfish', 'peanuts',
  'tree nuts', 'gluten', 'dairy', 'eggs', 'mushrooms',
] as const;

// Selecting a diet ticks several exclusions at once. The profile stores the
// exclusions, never the diet label, so nothing in the database reveals a
// religious belief.
export const DIET_PRESETS: Array<{ label: string; excludes: string[] }> = [
  { label: 'Halal', excludes: ['pork', 'alcohol'] },
  { label: 'Kosher', excludes: ['pork', 'shellfish'] },
  { label: 'Vegetarian', excludes: ['beef', 'pork', 'chicken', 'fish', 'shellfish'] },
  { label: 'Vegan', excludes: ['beef', 'pork', 'chicken', 'fish', 'shellfish', 'dairy', 'eggs', 'honey'] },
];

export { COOKING_STYLES, CUISINES, PRIORITIES };