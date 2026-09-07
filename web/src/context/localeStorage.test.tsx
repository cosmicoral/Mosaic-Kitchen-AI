import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocaleProvider, getStoredLocale, useLocale } from "./LocaleContext";

// The bug this exists for: apiFetch reads the stored locale to build the
// Accept-Language header, and the provider used to write that value in a
// useEffect. React runs child effects before parent effects, so a hook that
// refetched when the locale changed went out asking for the language the user
// had just left — the interface said English and the meal plan came back in
// Chinese, and the other way round. Exactly swapped, which is the shape of an
// ordering bug rather than a translation one.

function Toggle() {
  const { locale, setLocale } = useLocale();
  return (
    <button onClick={() => setLocale(locale === "en" ? "zh" : "en")}>{locale}</button>
  );
}

describe("locale storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // Explicit, because automatic cleanup only happens when the globals option
  // is on and this project does not turn it on. Without it the first test's
  // provider was still mounted during the second, which failed on "found
  // multiple elements with the role button" — a message that says nothing
  // about locales and sent me looking in the wrong file.
  afterEach(cleanup);

  it("is written before any effect can observe the change", () => {
    const { getByRole } = render(
      <LocaleProvider>
        <Toggle />
      </LocaleProvider>
    );

    const button = getByRole("button");
    const before = button.textContent;

    act(() => {
      button.click();
    });

    // Read the same way apiFetch reads it. It must already be the new value:
    // anything that reacts to the change reads this, and reads it first.
    expect(getStoredLocale()).not.toBe(before);
    expect(getStoredLocale()).toBe(button.textContent);
  });

  it("keeps the document language in step", () => {
    const { getByRole } = render(
      <LocaleProvider>
        <Toggle />
      </LocaleProvider>
    );

    act(() => {
      getByRole("button").click();
    });

    const expected = getStoredLocale() === "zh" ? "zh-CN" : "en";
    expect(document.documentElement.lang).toBe(expected);
  });
});
