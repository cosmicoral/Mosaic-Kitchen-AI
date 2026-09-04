import { COOKING_STYLES, CUISINES, PRIORITIES } from '../types';
import type {
  CookingStyle,
  Cuisine,
  ExtraKind,
  ExtrasFrequency,
  FlavourNote,
  Priority,
  SeasoningIntensity,
} from '../types';

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
// English labels; the locale layer translates them like every other string.
export const REGION_LABELS: Record<string, string> = {
  sichuan: 'Sichuan', cantonese: 'Cantonese', hunan: 'Hunan',
  jiangnan: 'Jiangnan / Shanghai', northern: 'Northern', dongbei: 'Dongbei',
  fujian: 'Fujian', yunnan: 'Yunnan', xinjiang: 'Xinjiang', hakka: 'Hakka',
  kanto: 'Kanto', kansai: 'Kansai', kyushu: 'Kyushu', hokkaido: 'Hokkaido',
  tohoku: 'Tohoku', okinawa: 'Okinawa',
  seoul: 'Seoul', jeolla: 'Jeolla', gyeongsang: 'Gyeongsang',
  gangwon: 'Gangwon', jeju: 'Jeju',
  punjabi: 'Punjabi', gujarati: 'Gujarati', bengali: 'Bengali', tamil: 'Tamil',
  kerala: 'Kerala', maharashtrian: 'Maharashtrian', rajasthani: 'Rajasthani',
  hyderabadi: 'Hyderabadi', sindhi: 'Sindhi', pashtun: 'Pashtun',
  kashmiri: 'Kashmiri',
  levantine: 'Levantine', iraqi: 'Iraqi', persian: 'Persian', egyptian: 'Egyptian',
  yemeni: 'Yemeni', palestinian: 'Palestinian',
  central: 'Central', isan: 'Isan', lanna: 'Lanna', southern: 'Southern',
  hue: 'Hue', mekong: 'Mekong',
  english: 'English', scottish: 'Scottish', welsh: 'Welsh',
  'northern-irish': 'Northern Irish',
  roman: 'Roman', neapolitan: 'Neapolitan', sicilian: 'Sicilian',
  emilian: 'Emilian', ligurian: 'Ligurian', tuscan: 'Tuscan', puglian: 'Puglian',
  oaxacan: 'Oaxacan', yucatecan: 'Yucatecan', poblano: 'Poblano',
  norteno: 'Norteño', veracruz: 'Veracruz',
  jamaican: 'Jamaican', trinidadian: 'Trinidadian', bajan: 'Bajan',
  guyanese: 'Guyanese', haitian: 'Haitian',
  nigerian: 'Nigerian', ghanaian: 'Ghanaian', senegalese: 'Senegalese',
  ivorian: 'Ivorian', 'sierra-leonean': 'Sierra Leonean',
  greek: 'Greek', turkish: 'Turkish', spanish: 'Spanish', cypriot: 'Cypriot',
  maltese: 'Maltese',
};

export function regionLabel(value: string): string {
  return REGION_LABELS[value.split(':')[1] ?? value] ?? value;
}

export const SEASONING_LABELS: Record<SeasoningIntensity, string> = {
  light: 'Light',
  balanced: 'Balanced seasoning',
  bold: 'Bold',
};

export const SEASONING_HINTS: Record<SeasoningIntensity, string> = {
  light: 'Let the main ingredient taste of itself.',
  balanced: 'However the cuisine normally seasons it.',
  bold: 'Fuller sauces, more aromatics, more chilli.',
};

// The Chinese characters are kept next to the English because they are the
// names most of these households actually use for these tastes, and 麻 in
// particular has no English word.
export const FLAVOUR_LABELS: Record<FlavourNote, string> = {
  sour: 'Sour 酸',
  sweet: 'Sweet 甜',
  bitter: 'Bitter 苦',
  spicy: 'Spicy 辣',
  umami: 'Savoury 鲜',
  numbing: 'Numbing 麻',
  aromatic: 'Aromatic 香',
  smoky: 'Smoky',
};

export const EXTRA_KIND_LABELS: Record<ExtraKind, string> = {
  fruit: 'Fruit',
  snack: 'Snacks',
  dessert: 'Dessert',
};

export const EXTRA_KIND_HINTS: Record<ExtraKind, string> = {
  fruit: 'Seasonal, whole or barely prepared.',
  snack: 'Small things between meals, from your cuisines.',
  dessert: 'The everyday kind, not a restaurant pudding.',
};

export const EXTRAS_FREQUENCY_LABELS: Record<ExtrasFrequency, string> = {
  few: 'Rarely',
  some: 'Sometimes',
  plenty: 'Most days',
};

export const EXTRAS_FREQUENCY_HINTS: Record<ExtrasFrequency, string> = {
  few: 'At most two days a week.',
  some: 'Three or four days a week.',
  plenty: 'Most days, sometimes more than one.',
};

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