import { z } from 'zod';
import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';
import type { SupportedLocale } from '../utils/locale.ts';
import { lookupIngredient } from './ingredientLexicon.ts';
import { generateStructured } from './openai.ts';

// A plan is written once, in the language it was generated in, and then lives
// in the database. Switching the interface language cannot retranslate it —
// the dish names and cooking steps are free text the model wrote. So this
// translates on demand, and the caller caches the result.
//
// The safety property that matters: only strings the household reads are sent
// to the model. estimated_cost_gbp, estimated_total_gbp, minutes, day_index,
// cuisine, region and from_pantry never enter the prompt and are copied across
// untouched. A translation therefore cannot turn £89.60 into something else,
// cannot invent a cuisine outside the user's list, and cannot quietly change
// what the shopping list is built from.

// native_name is not in here, deliberately. It holds the dish's name in its
// own script — 剁椒鱼头 stays 剁椒鱼头 in an English plan. Translating it would
// destroy the one field that exists to preserve it.
// 'card' is what a reader sees before opening anything: the summary, the tip
// and the dish names. 'detail' is the inside of a recipe. The split exists
// because the detail is where the cost is — cooking steps alone are about
// two thirds of the tokens in a plan — and most of it is never read.
export type TranslationScope = 'card' | 'full';

type Slot = {
  tier: 'card' | 'detail';
  // Ingredient names go through the lexicon first; everything else is prose
  // and can only come from a model.
  lexical?: boolean;
  get(plan: GeneratedMealPlan): string;
  set(plan: GeneratedMealPlan, value: string): void;
};

function slots(plan: GeneratedMealPlan, scope: TranslationScope): Slot[] {
  const found: Slot[] = [];

  found.push({
    tier: 'card',
    get: (p) => p.summary,
    set: (p, v) => {
      p.summary = v;
    },
  });

  if (plan.waste_reduction_tip) {
    found.push({
      tier: 'card',
      get: (p) => p.waste_reduction_tip ?? '',
      set: (p, v) => {
        p.waste_reduction_tip = v;
      },
    });
  }

  plan.days.forEach((day, d) => {
    day.meals.forEach((meal, m) => {
      found.push({
        tier: 'card',
        get: (p) => p.days[d]!.meals[m]!.name,
        set: (p, v) => {
          p.days[d]!.meals[m]!.name = v;
        },
      });

      meal.steps.forEach((_, s) => {
        found.push({
          tier: 'detail',
          get: (p) => p.days[d]!.meals[m]!.steps[s]!,
          set: (p, v) => {
            p.days[d]!.meals[m]!.steps[s] = v;
          },
        });
      });

      meal.ingredients.forEach((_, i) => {
        found.push({
          tier: 'detail',
          lexical: true,
          get: (p) => p.days[d]!.meals[m]!.ingredients[i]!.name,
          set: (p, v) => {
            p.days[d]!.meals[m]!.ingredients[i]!.name = v;
          },
        });
      });
    });

    (day.extras ?? []).forEach((_, e) => {
      found.push({
        tier: 'card',
        get: (p) => p.days[d]!.extras![e]!.name,
        set: (p, v) => {
          p.days[d]!.extras![e]!.name = v;
        },
      });
    });
  });

  return scope === 'full' ? found : found.filter((slot) => slot.tier === 'card');
}

// Indexed, not positional. The first version sent a flat list and demanded a
// list of exactly the same length back; for a fourteen-meal plan that is over
// two hundred strings, and a single missing entry threw the whole translation
// away. Carrying the index means a short or reordered answer costs only the
// entries that are actually missing.
const TranslationSchema = z.object({
  items: z.array(z.object({ i: z.number().int(), text: z.string() })),
});

// Small enough that one call is a short, reliable answer rather than a long
// one the model drifts through or truncates.
const BATCH_SIZE = 40;

const LANGUAGE_NAME: Record<SupportedLocale, string> = {
  en: 'British English',
  zh: 'Simplified Chinese',
};

export interface TranslationResult {
  plan: GeneratedMealPlan;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  // How much actually came back translated. The caller logs this: a plan that
  // silently returns half-translated is the kind of failure that otherwise
  // looks like the feature simply not working.
  translated: number;
  total: number;
  // How many came from the lookup table rather than the model. Worth reporting:
  // if this collapses, the table has stopped matching what the model produces
  // and the bill will have quietly gone back up.
  fromLexicon: number;
  scope: TranslationScope;
}

export async function translatePlan(
  plan: GeneratedMealPlan,
  target: SupportedLocale,
  scope: TranslationScope = 'full',
  call: typeof generateStructured = generateStructured
): Promise<TranslationResult> {
  // structuredClone rather than mutating: the caller still holds the original,
  // and a half-applied translation over the real plan would be worse than no
  // translation at all.
  const translated = structuredClone(plan);
  const fields = slots(translated, scope);

  let applied = 0;
  let fromLexicon = 0;

  // The table first. Ingredient names are over half the strings in a plan and
  // they repeat endlessly — garlic is garlic — so asking a model to rediscover
  // them is the most obviously wasteful call this product makes. Whatever the
  // table answers never reaches the prompt at all.
  const needsModel: Array<{ index: number; text: string }> = [];

  fields.forEach((slot, index) => {
    const current = slot.get(translated);

    if (slot.lexical) {
      const known = lookupIngredient(current, target);
      if (known) {
        slot.set(translated, known);
        applied += 1;
        fromLexicon += 1;
        return;
      }
    }

    needsModel.push({ index, text: current });
  });

  const systemPrompt = [
    `You translate cooking content into ${LANGUAGE_NAME[target]}.`,
    'The user gives you numbered strings from a meal plan: dish names, cooking steps, ingredient names, a summary and a waste tip.',
    `Return one item per input, each with the same "i" it was given and "text" set to the ${LANGUAGE_NAME[target]} version.`,
    'Translate meaning, not words: use the name a cook in that language would actually use for the dish, and the ordinary supermarket name for each ingredient.',
    'Keep numbers, quantities and units exactly as they appear.',
    'If a string is already in the target language, return it unchanged.',
  ].join('\n');

  let model = 'unknown';
  let promptTokens = 0;
  let completionTokens = 0;
  let costUsd = 0;

  for (let start = 0; start < needsModel.length; start += BATCH_SIZE) {
    const batch = needsModel.slice(start, start + BATCH_SIZE);

    // The number sent is the slot's own index, not its position in this batch,
    // so an answer can be merged without tracking which batch it came from.
    const userPrompt = batch.map((entry) => `${entry.index}. ${entry.text}`).join('\n');
    const expected = new Set(batch.map((entry) => entry.index));

    let result;
    try {
      result = await call(systemPrompt, userPrompt, TranslationSchema, 'plan_translation');
    } catch (error) {
      // One failed batch is not a reason to abandon the rest. The untranslated
      // entries keep their original text, which is readable — just not in the
      // language asked for.
      console.error(
        `Translation batch ${start}-${start + batch.length} into ${target} failed:`,
        error
      );
      continue;
    }

    model = result.model;
    promptTokens += result.promptTokens;
    completionTokens += result.completionTokens;
    costUsd += result.costUsd;

    for (const item of result.value.items) {
      // An index this batch did not ask about, or a blank string, is ignored
      // rather than written: a stray index would overwrite an unrelated dish,
      // and an empty string would blank a name that was readable before.
      if (!expected.has(item.i)) continue;
      if (item.text.trim() === '') continue;

      const slot = fields[item.i];
      if (!slot) continue;

      slot.set(translated, item.text);
      applied += 1;
    }
  }

  return {
    plan: translated,
    model,
    promptTokens,
    completionTokens,
    costUsd,
    translated: applied,
    total: fields.length,
    fromLexicon,
    scope,
  };
}

export function translatableStringCount(
  plan: GeneratedMealPlan,
  scope: TranslationScope = 'full'
): number {
  return slots(plan, scope).length;
}
