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
