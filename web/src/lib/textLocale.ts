import type { Locale } from "../context/LocaleContext";

// Han, kana and hangul. The same test the backend runs before accepting a
// generated plan; here it answers a narrower question — does this stored text
// match the language the reader has chosen — so a page can say so instead of
// leaving someone to wonder whether the toggle is broken.
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/;

export function looksCjk(value: string): boolean {
  return CJK.test(value);
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
