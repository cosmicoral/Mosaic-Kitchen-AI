// Every string the interface shows in Chinese mode should actually be in
// Chinese. Written after the pricing, subscription and login pages each
// shipped half-translated and were found one at a time by someone looking at
// a screen — the slowest possible way to find a missing dictionary entry.
//
// A script rather than a unit test, because it is a lint: it reads source as
// text and asks a question about the literals in it, not about behaviour.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Brand and proper nouns read the same in both languages.
const ALLOWED_LITERAL = new Set([
  'Mosaic Kitchen AI',
  'Mosaic Kitchen',
  'Mosaic Chef',
  'Google',
  'Plus',
  'Pro',
  'Free',
]);

function sources(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sources(path, out);
    else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
      out.push([path, readFileSync(path, 'utf8')]);
    }
  }
  return out;
}

function dictionaryKeys() {
  const source = readFileSync(join(srcRoot, 'context/LocaleContext.tsx'), 'utf8');
  const body = source.slice(
    source.indexOf('const zh: Record<string, string> = {'),
    source.indexOf('\n};')
  );

  // Pairs are packed several to a line, so this must not be anchored to line
  // starts. An earlier version was, and reported 188 false positives.
  return new Set([...body.matchAll(/'((?:[^'\\]|\\.)*)'\s*:/g)].map((m) => m[1]));
}

// Data files whose string values are rendered through t(<variable>). The
// literal check below cannot see those — the argument is not a literal at the
// call site — which is how the whole pricing table shipped in English while
// the checker reported no gaps. This was the third distinct class of hole, and
// the reason the list of files is explicit: a new label table has to be added
// here on purpose.
const LABEL_TABLES = [
  'lib/plans.ts',
  'lib/profileOptions.ts',
  'lib/mealPlanFormat.ts',
];

// Values that are not copy: enum slugs, css class names, price ids, icon keys.
const NOT_COPY = /^[a-z0-9_:-]+$|^https?:|^£|^\d/;

// BCP 47 tags and IANA zones read like words but are configuration.
const TECHNICAL = new Set([
  'UTC', 'en-GB', 'en-US', 'zh-CN', 'GBP', 'long', 'short', 'numeric',
  // Tier names, kept in English on purpose: they are what the Stripe invoice
  // and the support conversation will call the plan.
  'Free', 'Plus', 'Pro',
  // Sign-in provider names.
  'Google', 'Apple',
]);

const keys = dictionaryKeys();
const untranslated = [];
const hardcoded = [];

for (const [path, source] of sources(srcRoot)) {
  const where = relative(srcRoot, path);

  if (!path.includes('LocaleContext')) {
    const literals = [
      ...source.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g),
      ...source.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g),
    ].map((m) => m[1]);

    for (const literal of literals) {
      if (!keys.has(literal)) untranslated.push(`${where}: ${literal}`);
    }
  }

  // The other half of the problem: text that never reaches t() at all, so the
  // check above cannot see it. The login page's "Save money / Eat healthier /
  // Reduce food waste" were exactly this.
  //
  // (?<!=) keeps `=> Promise<void>` from reading as the word "Promise" sitting
  // between two tags. Type annotations are not user-facing copy.
  for (const match of source.matchAll(/(?<!=)>\s*([A-Z][A-Za-z][A-Za-z ,.'£&-]{3,70})\s*</g)) {
    const text = match[1].trim();
    if (ALLOWED_LITERAL.has(text)) continue;
    const line = source.slice(0, match.index).split('\n').length;
    hardcoded.push(`${where}:${line}: ${text}`);
  }
}

// Label maps declared inside a page or component, e.g.
//   const STATUS_LABELS: Record<string, string> = { active: 'Active', ... }
// These are rendered as t(STATUS_LABELS[x]) — a variable again — and live
// outside LABEL_TABLES, which is where the subscription page's "Active" badge
// hid. Found by shape rather than by a hand-maintained list, so a new one is
// covered the day it is written.
for (const [path, source] of sources(srcRoot)) {
  const where = relative(srcRoot, path);

  for (const block of source.matchAll(
    /(?:const|export const)\s+\w*(?:LABELS|COPY|TEXT)\w*\s*:\s*Record<[^>]*>\s*=\s*\{([\s\S]*?)\n\}/g
  )) {
    for (const pair of block[1].matchAll(/:\s*['"]([^'"\n]{2,})['"]/g)) {
      const value = pair[1];
      if (NOT_COPY.test(value) || TECHNICAL.has(value)) continue;
      if (!keys.has(value)) untranslated.push(`${where}: ${value}`);
    }
  }
}

for (const relPath of LABEL_TABLES) {
  const full = join(srcRoot, relPath);
  let source;
  try {
    source = readFileSync(full, 'utf8');
  } catch {
    console.error(`\nLABEL_TABLES lists ${relPath}, which does not exist.`);
    process.exit(1);
  }

  // Every single-quoted or double-quoted string value in the table. Anything
  // that looks like a slug, a price id, a URL or a number is skipped: those
  // are machine-readable values that are never shown to anyone.
  const values = [
    ...source.matchAll(/:\s*'((?:[^'\\\n]|\\.)*)'/g),
    ...source.matchAll(/:\s*"((?:[^"\\\n]|\\.)*)"/g),
    ...source.matchAll(/text:\s*'((?:[^'\\\n]|\\.)*)'/g),
  ].map((m) => m[1]);

  for (const value of values) {
    if (value.length < 2) continue;
    if (NOT_COPY.test(value)) continue;
    if (TECHNICAL.has(value)) continue;
    if (!keys.has(value)) untranslated.push(`${relPath}: ${value}`);
  }
}

if (untranslated.length > 0) {
  console.error(`\n${untranslated.length} string(s) render in English while the app is in Chinese:`);
  for (const entry of untranslated) console.error(`  ${entry}`);
}

if (hardcoded.length > 0) {
  console.error(`\n${hardcoded.length} hardcoded English string(s) in JSX — wrap them in t():`);
  for (const entry of hardcoded) console.error(`  ${entry}`);
}

if (untranslated.length > 0 || hardcoded.length > 0) process.exit(1);

console.log(`Locale coverage OK — ${keys.size} keys, no gaps.`);
