import { z } from 'zod';
import * as glossRepository from '../repositories/glossRepository.ts';
import { lookupIngredient } from './ingredientLexicon.ts';
import { generateStructured } from './openai.ts';
import type { SupportedLocale } from '../utils/locale.ts';

// A short translation shown *underneath* an ingredient name, never in place of
// it. The pantry and shopping list hold the user's own rows and the server does
// not rewrite them — but a reader who has chosen English still needs to know
// what 云南酸菜 is.
//
// Three tiers, cheapest first:
//   1. the curated lexicon, including its prefix/suffix decomposition — free
//   2. the shared gloss cache — free after the first time anyone asks
//   3. one batched model call, cached forever
//
// The cache is global rather than per user because the answer does not vary by
// who asked, and paying for 生抽 once rather than once per household is the
// entire point.

const MAX_NAMES = 60;

const GlossSchema = z.object({
  items: z.array(z.object({ i: z.number().int(), text: z.string() })),
});

export interface Gloss {
  source: string;
  gloss: string;
  // Where it came from, so the interface can decide what to trust and a log can
  // show how much is being paid for.
  via: 'lexicon' | 'cache' | 'model';
}

export async function glossIngredients(
  names: readonly string[],
  target: SupportedLocale
): Promise<Gloss[]> {
  // Deduplicated before anything else: a shopping list repeats 大蒜 across
  // several meals, and paying once per row rather than once per distinct name
  // would be paying for the same answer five times.
  const distinct = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(
    0,
    MAX_NAMES
  );
  if (distinct.length === 0) return [];

  const results: Gloss[] = [];
  const unresolved: string[] = [];

  for (const name of distinct) {
    const known = lookupIngredient(name, target);
    if (known) {
      results.push({ source: name, gloss: known, via: 'lexicon' });
    } else {
      unresolved.push(name);
    }
  }

  if (unresolved.length === 0) return results;

  const cached = await glossRepository.findMany(unresolved, target);
  const stillUnresolved: string[] = [];

  for (const name of unresolved) {
    const hit = cached.get(normalise(name));
    if (hit) results.push({ source: name, gloss: hit, via: 'cache' });
    else stillUnresolved.push(name);
  }

  if (stillUnresolved.length === 0) return results;

  const fresh = await askModel(stillUnresolved, target);
  for (const [name, gloss] of fresh) {
    results.push({ source: name, gloss, via: 'model' });
  }

  return results;
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

async function askModel(
  names: readonly string[],
  target: SupportedLocale,
  call: typeof generateStructured = generateStructured
): Promise<Map<string, string>> {
  const language = target === 'en' ? 'British English' : 'Simplified Chinese';

  const systemPrompt = [
    `You translate the names of food ingredients into ${language}.`,
    'The user gives you numbered ingredient names. Return one item per input with the same "i".',
    'Give the ordinary supermarket name a shopper would recognise, not a literal word-by-word rendering.',
    'Keep it short: a name, not a description or a sentence.',
    'If a name is a phrase offering alternatives, translate the whole phrase.',
    'If you cannot tell what an ingredient is, return the input unchanged rather than guessing.',
  ].join('\n');

  const userPrompt = names.map((name, index) => `${index}. ${name}`).join('\n');

  let result;
  try {
    result = await call(systemPrompt, userPrompt, GlossSchema, 'ingredient_gloss');
  } catch (error) {
    // Soft failure. The interface already shows the name in its original
    // language; an error card over a missing annotation would be worse than
    // the annotation being absent.
    console.error(`Could not gloss ${names.length} ingredient(s) into ${target}:`, error);
    return new Map();
  }

  const resolved = new Map<string, string>();
  const toCache: Array<{ source: string; gloss: string }> = [];

  for (const item of result.value.items) {
    const source = names[item.i];
    if (!source) continue;

    const gloss = item.text.trim();
    // An empty answer, or one identical to the input, is the model saying it
    // does not know. Caching that would be paying to store a non-answer and
    // then never asking again.
    if (gloss === '' || normalise(gloss) === normalise(source)) continue;

    resolved.set(source, gloss);
    toCache.push({ source: normalise(source), gloss });
  }

  if (toCache.length > 0) {
    await glossRepository.saveMany(toCache, target, result.model);
  }

  return resolved;
}
