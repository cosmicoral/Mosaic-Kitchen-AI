import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEXICON_ENTRIES,
  MODIFIER_ENTRIES,
  UNIT_ENTRIES,
} from '../src/services/ingredientLexicon.ts';

// The pantry and the shopping list are rows the user owns, so the server never
// rewrites them. But a row that says 生抽 can still be *displayed* as "Light
// soy sauce" to a reader who has chosen English — that is a view, not an edit,
// and it costs nothing because the table is already written.
//
// The table has to exist on the client for that, and a second hand-maintained
// copy would drift the first time somebody adds an entry to one of them. So
// the backend file stays canonical and this generates the client's copy.
// tests/webLexiconSync.test.ts fails if the generated file is out of date.

const header = `// GENERATED FILE — do not edit.
//
// Run \`npm run generate:lexicon\` in backend/ after changing
// backend/src/services/ingredientLexicon.ts.
//
// Why a copy exists at all: the pantry and shopping list hold rows the user
// owns, in whatever language they were created in. The server does not rewrite
// them — they are the user's data. This table lets the interface *display*
// them in the language the reader has chosen, which is a view rather than an
// edit, and needs no request and no model call.
`;

const body = `
interface Entry {
  en: string;
  zh: string;
  also?: string[];
}

const LEXICON: Entry[] = ${JSON.stringify(LEXICON_ENTRIES, null, 2)};

const UNITS: Entry[] = ${JSON.stringify(UNIT_ENTRIES, null, 2)};

interface Modifier {
  zh: string;
  at: 'prefix' | 'suffix';
  en: string;
}

// Cuts and preparations. The model writes 带骨鸡腿, not 鸡腿 — a base the
// table knows wearing a modifier it does not. Peeling the modifier off beats
// adding a row per combination, because the combinations multiply and the
// bases do not.
const MODIFIERS: Modifier[] = ${JSON.stringify(MODIFIER_ENTRIES, null, 2)};

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\\s+/g, ' ');
}

function build(entries: Entry[]) {
  const toEn = new Map<string, string>();
  const toZh = new Map<string, string>();

  for (const entry of entries) {
    toEn.set(normalise(entry.zh), entry.en);
    toZh.set(normalise(entry.en), entry.zh);

    for (const alias of entry.also ?? []) {
      const key = normalise(alias);
      if (/[\\u4e00-\\u9fff]/.test(alias)) toEn.set(key, entry.en);
      else toZh.set(key, entry.zh);
    }
  }

  return { toEn, toZh };
}

const ingredients = build(LEXICON);
const units = build(UNITS);

// Exact match only, and null on a miss. A looser matcher would turn 青椒炒肉丝
// into "green pepper" and send someone home with the wrong thing; showing the
// user's own words unchanged is the safe failure.
function look(
  tables: { toEn: Map<string, string>; toZh: Map<string, string> },
  value: string,
  locale: 'en' | 'zh'
): string | null {
  const table = locale === 'en' ? tables.toEn : tables.toZh;
  return table.get(normalise(value)) ?? null;
}

// Falls back to the original text rather than to a placeholder: a name the
// table does not know is still the name the user gave it.
function applyModifier(template: string, base: string): string {
  return template.replace('{base:lower}', base.toLowerCase()).replace('{base}', base);
}

// At most one prefix and one suffix. Candidates are tried in order because a
// suffix can be greedy: 肉 matches the end of 云南腊肉 and leaves 云南腊, which
// is not a word.
function decompose(name: string): string | null {
  const trimmed = name.trim();

  const prefix = MODIFIERS.find((m) => m.at === 'prefix' && trimmed.startsWith(m.zh));
  const afterPrefix = prefix ? trimmed.slice(prefix.zh.length) : trimmed;
  const suffix = MODIFIERS.find((m) => m.at === 'suffix' && afterPrefix.endsWith(m.zh));

  const candidates: Array<{ base: string; wrap: (value: string) => string }> = [];

  if (prefix && suffix) {
    candidates.push({
      base: afterPrefix.slice(0, -suffix.zh.length),
      // Suffix names the thing, prefix qualifies the whole of it.
      wrap: (v) => applyModifier(prefix.en, applyModifier(suffix.en, v)),
    });
  }
  if (prefix) {
    candidates.push({ base: afterPrefix, wrap: (v) => applyModifier(prefix.en, v) });
  }
  if (suffix) {
    candidates.push({
      base: afterPrefix.slice(0, -suffix.zh.length),
      wrap: (v) => applyModifier(suffix.en, v),
    });
  }

  for (const candidate of candidates) {
    if (candidate.base.length < 1) continue;
    const translated = ingredients.toEn.get(normalise(candidate.base));
    if (translated) return candidate.wrap(translated);
  }

  return null;
}

export function displayIngredient(name: string, locale: 'en' | 'zh'): string {
  const exact = look(ingredients, name, locale);
  if (exact) return exact;

  // English only: the modifier phrasings are English sentences, and 带骨/薄片
  // do not agree with "bone-in"/"thinly sliced" on either position or grammar.
  if (locale === 'en') return decompose(name) ?? name;

  return name;
}

export function displayUnit(unit: string, locale: 'en' | 'zh'): string {
  return look(units, unit, locale) ?? unit;
}
`;

const target = join(
  import.meta.dirname,
  '..',
  '..',
  'web',
  'src',
  'lib',
  'ingredientLexicon.ts'
);

writeFileSync(target, header + body);
console.log(
  `Wrote ${target} — ${LEXICON_ENTRIES.length} ingredients, ${UNIT_ENTRIES.length} units.`
);
