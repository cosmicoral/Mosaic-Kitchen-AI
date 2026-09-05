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

export interface LanguageViolation {
  locale: SupportedLocale;
  field: string;
  sample: string;
}

// native_name is excluded everywhere on purpose. It is the one field that is
// supposed to be in the dish's own script — 麻婆豆腐 stays 麻婆豆腐 in an
// English plan, and flagging it would break the feature it exists for.
function userFacingStrings(plan: GeneratedMealPlan): Array<[string, string]> {
  const entries: Array<[string, string]> = [['summary', plan.summary]];

  if (plan.waste_reduction_tip) {
    entries.push(['waste_reduction_tip', plan.waste_reduction_tip]);
  }

  plan.days.forEach((day, dayIndex) => {
    day.meals.forEach((meal, mealIndex) => {
      const where = `days[${dayIndex}].meals[${mealIndex}]`;
      entries.push([`${where}.name`, meal.name]);
      meal.steps.forEach((step, stepIndex) => {
        entries.push([`${where}.steps[${stepIndex}]`, step]);
      });
      meal.ingredients.forEach((ingredient, ingredientIndex) => {
        entries.push([`${where}.ingredients[${ingredientIndex}]`, ingredient.name]);
      });
    });

    (day.extras ?? []).forEach((extra, extraIndex) => {
      entries.push([`days[${dayIndex}].extras[${extraIndex}].name`, extra.name]);
    });
  });

  return entries;
}

export function findLanguageViolation(
  plan: GeneratedMealPlan,
  locale: SupportedLocale
): LanguageViolation | null {
  const entries = userFacingStrings(plan);

  if (locale === 'en') {
    // One offending field is enough to know the plan came back in the wrong
    // language; the retry prompt does not get more useful from a longer list.
    const offender = entries.find(([, value]) => CJK.test(value));
    if (!offender) return null;
    return { locale, field: offender[0], sample: offender[1].slice(0, 40) };
  }

  // The mirror check. A Chinese plan cannot be recognised field by field —
  // "Kimchi" is a perfectly good word in a Chinese sentence — so this asks
  // whether the plan as a whole contains any Chinese at all. If the summary
  // and every dish name are pure Latin, Chinese was not what came back.
  const anyCjk = entries.some(([, value]) => CJK.test(value));
  if (anyCjk) return null;

  const first = entries[0];
  return {
    locale,
    field: first?.[0] ?? 'summary',
    sample: (first?.[1] ?? '').slice(0, 40),
  };
}

export function describeLanguageViolation(violation: LanguageViolation): string {
  return violation.locale === 'en'
    ? `The previous attempt wrote ${violation.field} in Chinese ("${violation.sample}"). Every user-facing string must be in British English. The only exception is native_name, which stays in the dish's original script. Ingredient names given to you in Chinese must be translated into English in your answer.`
    : `The previous attempt wrote ${violation.field} in English ("${violation.sample}"). Every user-facing string must be in Simplified Chinese, except native_name, which stays in the dish's original script.`;
}
