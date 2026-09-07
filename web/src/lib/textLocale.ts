import type { Locale } from "../context/LocaleContext";
import type { GeneratedMealPlan } from "../types";
import { displayIngredient, displayUnit } from "./ingredientLexicon";

// Han, kana and hangul. The same test the backend runs before accepting a
// generated plan; here it answers a narrower question — does this stored text
// match the language the reader has chosen — so a page can say so instead of
// leaving someone to wonder whether the toggle is broken.
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/;
const HAN = /[㐀-䶿一-鿿豈-﫿]/;

export function looksCjk(value: string): boolean {
  return CJK.test(value);
}

// A last-line display guard for AI-generated labels. The backend repairs old
// rows, but a failed repair must not leak a Chinese region badge into the
// English dashboard. User-entered pantry text does not go through this helper.
export function generatedTextOrFallback(
  value: string | null | undefined,
  locale: Locale,
  fallback = ''
): string {
  if (!value) return fallback;
  const mismatches =
    locale === 'en'
      ? looksCjk(value)
      : !HAN.test(value);
  return mismatches ? fallback : value;
}

export function labelMonogram(value: string): string {
  return Array.from(value.trim()).slice(0, 2).join('').toLocaleUpperCase();
}

// Only for text the app generated. Never call this on something the user typed
// themselves: a pantry entry they wrote as 生抽 is their own data, and it is
// correct in every interface language.
export function mismatchesLocale(values: string[], locale: Locale): boolean {
  if (values.length === 0) return false;

  return locale === "zh"
    ? // Asking "is any of it Chinese" rather than "is all of it English",
      // because a Chinese list can legitimately contain a Latin word.
      !values.some(looksCjk)
    : values.some(looksCjk);
}

export function generatedPlanMismatchesLocale(
  plan: GeneratedMealPlan,
  locale: Locale,
  scope: 'card' | 'full' = 'full'
): boolean {
  const values: string[] = [plan.summary];
  if (plan.waste_reduction_tip) values.push(plan.waste_reduction_tip);

  for (const day of plan.days) {
    for (const meal of day.meals) {
      values.push(meal.name);
      if (meal.region) values.push(meal.region);

      if (scope === 'full') {
        values.push(...meal.steps);
        for (const ingredient of meal.ingredients) {
          values.push(displayIngredient(ingredient.name, locale));
          values.push(displayUnit(ingredient.unit, locale));
        }
      }
    }

    for (const extra of day.extras ?? []) {
      values.push(extra.name);
      if (scope === 'full') {
        if (extra.note) values.push(extra.note);
        for (const ingredient of extra.ingredients ?? []) {
          values.push(displayIngredient(ingredient.name, locale));
          values.push(displayUnit(ingredient.unit, locale));
        }
      }
    }
  }

  return values.some((value) =>
    locale === 'en' ? looksCjk(value) : !HAN.test(value)
  );
}
