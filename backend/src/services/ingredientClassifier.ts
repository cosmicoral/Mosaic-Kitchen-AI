import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import * as shelfLifeRepository from '../repositories/shelfLifeRepository.ts';
import { PANTRY_CATEGORIES } from '../types/index.ts';
import type { PantryCategory } from '../types/index.ts';

const MODEL = process.env.OPENAI_CLASSIFIER_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-5.6-luna';

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // Far shorter than the meal-plan timeout. This runs while somebody is
      // waiting on a form submit, and a slow answer is worse than no answer:
      // the item saves fine without a class.
      timeout: 15_000,
      maxRetries: 1,
    });
  }
  return client;
}

export interface Classification {
  category: PantryCategory;
  shelfLifeClass: string | null;
}

const SYSTEM_PROMPT = `You sort kitchen ingredients into storage categories.

The name may be in any language and may include a preparation ("thinly sliced
pork loin", "干木耳", "木棉豆腐"). Classify what the thing fundamentally is.

Pick the shelf-life class that matches how the item spoils, not what dish it
goes into. If nothing fits, return null rather than forcing a match — a wrong
shelf-life class produces a wrong date, and a missing one just leaves the date
to the user.`;

function buildSchema(classIds: readonly string[]) {
  return z.object({
    category: z.enum(PANTRY_CATEGORIES),
    // Nullable rather than optional: structured outputs require every property
    // to be present, and "no good match" has to be sayable.
    shelf_life_class:
      classIds.length > 0
        ? z.enum(classIds as [string, ...string[]]).nullable()
        : z.string().nullable(),
  });
}

// Returns a best-effort classification. Never throws: an ingredient that
// cannot be classified is an ingredient with no estimated date, which is
// exactly the state everything was in before this existed.
export async function classify(name: string): Promise<Classification | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const classes = await shelfLifeRepository.all();
    const catalogue = [...classes.values()]
      .map((entry) => `${entry.id}: ${entry.label}`)
      .join('\n');

    const completion = await openai().chat.completions.parse({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Ingredient: ${name}\n\nShelf-life classes:\n${catalogue}`,
        },
      ],
      response_format: zodResponseFormat(
        buildSchema([...classes.keys()]),
        'ingredient_classification'
      ),
    });

    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) return null;

    return {
      category: parsed.category,
      shelfLifeClass: parsed.shelf_life_class,
    };
  } catch (error) {
    // Logged, not surfaced. The caller is in the middle of saving a pantry
    // item and the classification is an enhancement, not part of the record.
    console.warn(`Could not classify ingredient "${name}":`, error);
    return null;
  }
}

// One call for a whole shopping list rather than one per item. Sent in
// parallel because they are independent, and capped so a fifty-item list does
// not open fifty sockets at once.
export async function classifyMany(
  names: readonly string[],
  concurrency = 5
): Promise<Map<string, Classification>> {
  const results = new Map<string, Classification>();
  const queue = [...new Set(names)];

  async function worker() {
    for (;;) {
      const name = queue.shift();
      if (name === undefined) return;
      const result = await classify(name);
      if (result) results.set(name, result);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, worker)
  );

  return results;
}
