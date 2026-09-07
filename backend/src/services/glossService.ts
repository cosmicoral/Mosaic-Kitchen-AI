import { z } from 'zod';
import * as aiUsageRepository from '../repositories/aiUsageRepository.ts';
import * as glossRepository from '../repositories/glossRepository.ts';
import * as billingService from './billingService.ts';
import { lookupIngredient } from './ingredientLexicon.ts';
import { generateStructured } from './openai.ts';
import { userSpendBand } from './spendGuard.ts';
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
//
// It is not, however, free, and for a while it was worse than that: it made a
// model call and recorded nothing, so the spend never appeared in ai_usage and
// therefore never appeared in either the per-user band or the whole-product
// ceiling. The cost was small — most names never reach tier 3 — but it was the
// bad kind of small: unmeasured, and the one line that a loop of random
// strings could have grown without anything noticing.
//
// It is metered but not rationed. There is no glossesPerMonth in entitlements
// and there should not be: this is an accessibility annotation, and a reader
// who has chosen English and is over an invisible gloss quota gets a shopping
// list of characters they cannot read. The bound is the per-account spend
// ceiling, which only bites when something has gone wrong.

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
  target: SupportedLocale,
  userId: string
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

  // Everything above this line is free, so the ceiling is read here rather
  // than at the top of the function: an account over its limit still gets the
  // lexicon and the shared cache, which between them answer most names. Only
  // the part that costs money stops.
  const tier = await billingService.getTier(userId);
  if ((await userSpendBand(userId, tier)) === 'blocked') {
    console.warn(
      `Skipping ${stillUnresolved.length} model gloss(es) for user ${userId}: over the spend ceiling.`
    );
    return results;
  }

  const fresh = await askModel(stillUnresolved, target, userId);
  for (const [name, gloss] of fresh) {
    results.push({ source: name, gloss, via: 'model' });
  }

  return results;
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

interface UsageShape {
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

// Never allowed to fail the request. A gloss is decoration on a page that is
// already correct without it, so an unavailable database on the accounting
// path must not take away a shopping list that was rendering fine.
async function recordUsage(
  userId: string,
  usage: UsageShape,
  succeeded: boolean
): Promise<void> {
  try {
    await aiUsageRepository.record(userId, {
      feature: 'ingredient-gloss',
      model: usage.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      costUsd: usage.costUsd,
      succeeded,
    });
  } catch (error) {
    console.error('Could not record ingredient-gloss usage:', error);
  }
}

async function askModel(
  names: readonly string[],
  target: SupportedLocale,
  userId: string,
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

    // Recorded even so. A failed call is exactly the case a spend ceiling
    // exists for — a loop that never succeeds bills every time round — and a
    // guard that only sees successes is blind to precisely that. The cost is
    // zero here because the exception carries no usage figures; the row is
    // still worth writing, because the count of failures is the signal.
    await recordUsage(userId, { model: 'unknown', promptTokens: 0, completionTokens: 0, costUsd: 0 }, false);
    return new Map();
  }

  await recordUsage(userId, result, true);

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
