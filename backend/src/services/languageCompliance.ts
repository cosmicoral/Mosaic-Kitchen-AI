import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';
import type { SupportedLocale } from '../utils/locale.ts';

// Why this exists: asking for English in the system prompt is not enough when
// the user prompt is mostly Chinese. The pantry holds 生抽 and 芫荽, the regions
// are 湖南 and 전라도, and one English sentence at the end of a system message
// does not outweigh a page of Chinese content — the model answers in the
// language it is reading. Prompting is the first layer; this is the layer that
// makes the promise actually hold.

// Any CJK ideograph, plus kana and hangul. Deliberately broad: the question is
// "did this come back in an East Asian language when British English was
// asked for", not "which one".
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/;
const HAN = /[㐀-䶿一-鿿豈-﫿]/;

// These are symbols rather than English words, and they are conventional in
// Chinese recipes too. Everything else — including "piece", "tbsp" and
// "Hunan" — must actually be localised instead of being waved through because
// some unrelated summary elsewhere in the plan contains Chinese.
const LOCALE_NEUTRAL_UNIT = /^(?:mg|g|kg|ml|cl|l|mm|cm|°c)$/i;

function isLocaleNeutral(field: string, value: string): boolean {
  return field.endsWith('.unit') && LOCALE_NEUTRAL_UNIT.test(value.trim());
}

export interface LanguageViolation {
  locale: SupportedLocale;
  field: string;
  sample: string;
}

export type LanguageCheckScope = 'card' | 'full';

// native_name is excluded everywhere on purpose. It is the one field that is
// supposed to be in the dish's own script — 麻婆豆腐 stays 麻婆豆腐 in an
// English plan, and flagging it would break the feature it exists for.
//
// `unit` and `region` were excluded by accident, which is a different thing
// entirely. Both are free text the model writes, both are rendered straight
// onto the page, and neither was ever checked — so an otherwise perfect
// English plan came back reading "180克 Beef, thinly sliced" under a heading
// of "korean:全罗道". The guard looked complete because every field anyone
// thought of was in the list; the two nobody thought of were the two that
// broke.
export function userFacingStrings(
  plan: GeneratedMealPlan,
  scope: LanguageCheckScope = 'full'
): Array<[string, string]> {
  const entries: Array<[string, string]> = [['summary', plan.summary]];

  const add = (field: string, value: unknown) => {
    // Stored plans pre-date some of the current fields. Treat absent legacy
    // values as absent rather than coercing them to the string "undefined".
    if (typeof value === 'string' && value.trim() !== '') entries.push([field, value]);
  };

  if (plan.waste_reduction_tip) {
    entries.push(['waste_reduction_tip', plan.waste_reduction_tip]);
  }

  plan.days.forEach((day, dayIndex) => {
    day.meals.forEach((meal, mealIndex) => {
      const where = `days[${dayIndex}].meals[${mealIndex}]`;
      add(`${where}.name`, meal.name);
      // Short, and a label rather than prose, but the reader sees it above
      // every dish. 'Jeolla' in an English plan, '全罗道' in a Chinese one.
      add(`${where}.region`, meal.region);

      if (scope === 'full') {
        meal.steps.forEach((step, stepIndex) => {
          add(`${where}.steps[${stepIndex}]`, step);
        });
        meal.ingredients.forEach((ingredient, ingredientIndex) => {
          const ingredientWhere = `${where}.ingredients[${ingredientIndex}]`;
          add(`${ingredientWhere}.name`, ingredient.name);
          add(`${ingredientWhere}.unit`, ingredient.unit);
        });
      }
    });

    (day.extras ?? []).forEach((extra, extraIndex) => {
      const where = `days[${dayIndex}].extras[${extraIndex}]`;
      add(`${where}.name`, extra.name);

      if (scope === 'full') {
        add(`${where}.note`, extra.note);
        (extra.ingredients ?? []).forEach((ingredient, ingredientIndex) => {
          const ingredientWhere = `${where}.ingredients[${ingredientIndex}]`;
          add(`${ingredientWhere}.name`, ingredient.name);
          add(`${ingredientWhere}.unit`, ingredient.unit);
        });
      }
    });
  });

  return entries;
}

export function findLanguageViolation(
  plan: GeneratedMealPlan,
  locale: SupportedLocale,
  scope: LanguageCheckScope = 'full'
): LanguageViolation | null {
  const entries = userFacingStrings(plan, scope);

  if (locale === 'en') {
    // One offending field is enough to know the plan came back in the wrong
    // language; the retry prompt does not get more useful from a longer list.
    const offender = entries.find(([, value]) => CJK.test(value));
    if (!offender) return null;
    return { locale, field: offender[0], sample: offender[1].slice(0, 40) };
  }

  // Check field by field. The previous whole-plan check accepted an English
  // dish name, region and method as soon as one unrelated summary happened to
  // contain a Chinese character — exactly the mixed dashboard it was meant to
  // prevent. Authentic native_name is not in entries, so it remains exempt.
  const offender = entries.find(
    ([field, value]) => !HAN.test(value) && !isLocaleNeutral(field, value)
  );
  if (!offender) return null;

  return {
    locale,
    field: offender[0],
    sample: offender[1].slice(0, 40),
  };
}

export function describeLanguageViolation(violation: LanguageViolation): string {
  return violation.locale === 'en'
    ? `The previous attempt wrote ${violation.field} in Chinese ("${violation.sample}"). Every user-facing string must be in British English. The only exception is native_name, which stays in the dish's original script. Ingredient names given to you in Chinese must be translated into English in your answer.`
    : `The previous attempt did not write ${violation.field} in Simplified Chinese ("${violation.sample}"). Every user-facing string must be in Simplified Chinese, except native_name, which stays in the dish's original script. Translate source names and region labels instead of copying English through.`;
}
