import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';
import type { PantryCategory } from '../types/index.ts';

export interface AggregatedItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: PantryCategory;
}

// Models write the same unit several ways. Normalising to one spelling is what
// makes "100 g" and "100 grams" addable.
const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gramme: 'g', grammes: 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  clove: 'clove', cloves: 'clove',
  can: 'can', cans: 'can', tin: 'can', tins: 'can',
  pack: 'pack', packs: 'pack', packet: 'pack', packets: 'pack',
  large: 'unit', medium: 'unit', small: 'unit',
  unit: 'unit', units: 'unit', piece: 'unit', pieces: 'unit',
  stalk: 'stalk', stalks: 'stalk',
  bunch: 'bunch', bunches: 'bunch',
};

// Only within a family can quantities be converted and added. Grams and
// tablespoons describe different things and must never be summed.
const CONVERSIONS: Record<string, { base: string; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  l: { base: 'ml', factor: 1000 },
};

const CATEGORY_KEYWORDS: Array<[PantryCategory, string[]]> = [
  ['protein', ['chicken', 'beef', 'lamb', 'pork', 'fish', 'haddock', 'salmon', 'prawn', 'tofu', 'egg', 'mince', 'bacon', 'sausage', 'lentil', 'chickpea', 'bean']],
  ['dairy', ['milk', 'cheese', 'butter', 'yoghurt', 'yogurt', 'cream', 'creme']],
  ['grains', ['rice', 'pasta', 'noodle', 'bread', 'flour', 'oat', 'couscous', 'tortilla', 'wrap']],
  ['frozen', ['frozen']],
  ['condiments', ['sauce', 'oil', 'vinegar', 'soy', 'paste', 'spice', 'powder', 'salt', 'pepper', 'stock', 'honey', 'sugar', 'seasoning', 'curry']],
  ['vegetables', ['spinach', 'onion', 'garlic', 'tomato', 'carrot', 'potato', 'pepper', 'broccoli', 'cabbage', 'lettuce', 'mushroom', 'courgette', 'aubergine', 'pea', 'ginger', 'coriander', 'lemon', 'lime']],
];

function normaliseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normaliseUnit(unit: string | null): string | null {
  if (!unit) return null;
  const key = unit.trim().toLowerCase();
  return UNIT_ALIASES[key] ?? key;
}

// Falls through to 'other' rather than guessing: a wrong category is more
// annoying in a supermarket than an uncategorised one.
function guessCategory(name: string): PantryCategory {
  const lower = normaliseName(name);
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category;
  }
  return 'other';
}

// Title case for display, since the model's capitalisation is inconsistent and
// the grouping key is lowercase anyway.
function displayName(name: string): string {
  return name
    .split(' ')
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function aggregateShoppingList(plan: GeneratedMealPlan): AggregatedItem[] {
  // Keyed by name + unit family, so "200g spinach" and "1 bunch spinach"
  // survive as two lines rather than being silently added together.
  const buckets = new Map<string, AggregatedItem>();

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        // The whole point of asking the model to mark these: anything already
        // in the kitchen does not belong on a shopping list.
        if (ingredient.from_pantry) continue;

        const name = normaliseName(ingredient.name);
        const unit = normaliseUnit(ingredient.unit);
        const conversion = unit ? CONVERSIONS[unit] : undefined;

        // Convert to the family's base unit before summing, so 1kg and 500g
        // become 1500g rather than 1501 of nothing.
        const baseUnit = conversion?.base ?? unit;
        const quantity = conversion
          ? ingredient.quantity * conversion.factor
          : ingredient.quantity;

        const key = `${name}::${baseUnit ?? ''}`;
        const existing = buckets.get(key);

        if (existing) {
          existing.quantity = (existing.quantity ?? 0) + quantity;
        } else {
          buckets.set(key, {
            name: displayName(name),
            quantity,
            unit: baseUnit,
            category: guessCategory(name),
          });
        }
      }
    }
  }

  return [...buckets.values()]
    .map((item) => ({
      ...item,
      // Grams and millilitres accumulate into awkward numbers; 1500g reads
      // better as 1.5kg.
      ...scaleUp(item),
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

function scaleUp(item: AggregatedItem): Partial<AggregatedItem> {
  if (item.quantity === null) return {};
  if (item.unit === 'g' && item.quantity >= 1000) {
    return { quantity: Math.round((item.quantity / 1000) * 100) / 100, unit: 'kg' };
  }
  if (item.unit === 'ml' && item.quantity >= 1000) {
    return { quantity: Math.round((item.quantity / 1000) * 100) / 100, unit: 'l' };
  }
  return { quantity: Math.round(item.quantity * 100) / 100 };
}