import { z } from 'zod';
import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';
import type { SupportedLocale } from '../utils/locale.ts';
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
type Slot = {
  get(plan: GeneratedMealPlan): string;
  set(plan: GeneratedMealPlan, value: string): void;
};

function slots(plan: GeneratedMealPlan): Slot[] {
  const found: Slot[] = [];

  found.push({
    get: (p) => p.summary,
    set: (p, v) => {
      p.summary = v;
    },
  });

  if (plan.waste_reduction_tip) {
    found.push({
      get: (p) => p.waste_reduction_tip ?? '',
      set: (p, v) => {
        p.waste_reduction_tip = v;
      },
    });
  }

  plan.days.forEach((day, d) => {
    day.meals.forEach((meal, m) => {
      found.push({
        get: (p) => p.days[d]!.meals[m]!.name,
        set: (p, v) => {
          p.days[d]!.meals[m]!.name = v;
        },
      });

      meal.steps.forEach((_, s) => {
        found.push({
          get: (p) => p.days[d]!.meals[m]!.steps[s]!,
          set: (p, v) => {
            p.days[d]!.meals[m]!.steps[s] = v;
          },
        });
      });

      meal.ingredients.forEach((_, i) => {
        found.push({
          get: (p) => p.days[d]!.meals[m]!.ingredients[i]!.name,
          set: (p, v) => {
            p.days[d]!.meals[m]!.ingredients[i]!.name = v;
          },
        });
      });
    });

    (day.extras ?? []).forEach((_, e) => {
      found.push({
        get: (p) => p.days[d]!.extras![e]!.name,
        set: (p, v) => {
          p.days[d]!.extras![e]!.name = v;
        },
      });
    });
  });

  return found;
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
}

export async function translatePlan(
  plan: GeneratedMealPlan,
  target: SupportedLocale,
  call: typeof generateStructured = generateStructured
): Promise<TranslationResult> {
  // structuredClone rather than mutating: the caller still holds the original,
  // and a half-applied translation over the real plan would be worse than no
  // translation at all.
  const translated = structuredClone(plan);
  const fields = slots(translated);
  const source = fields.map((slot) => slot.get(translated));

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
  let applied = 0;

  for (let start = 0; start < source.length; start += BATCH_SIZE) {
    const batch = source.slice(start, start + BATCH_SIZE);
    const userPrompt = batch
      .map((value, offset) => `${start + offset}. ${value}`)
      .join('\n');

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
      const slot = fields[item.i];
      // An index outside this batch, or a blank string, is ignored rather than
      // written: a wrong index would overwrite an unrelated dish, and an empty
      // string would blank a name that was perfectly readable before.
      if (!slot) continue;
      if (item.i < start || item.i >= start + batch.length) continue;
      if (item.text.trim() === '') continue;

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
  };
}

export function translatableStringCount(plan: GeneratedMealPlan): number {
  return slots(plan).length;
}
