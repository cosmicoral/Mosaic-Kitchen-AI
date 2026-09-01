import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { GeneratedMealPlanSchema } from '../schemas/mealPlan.ts';
import type { GeneratedMealPlan } from '../schemas/mealPlan.ts';
import type { z } from 'zod';

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5.6-luna': { input: 0.2, output: 1.2 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
};

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.6-luna';

// Fail at startup rather than silently recording every call as costing zero.
// Wrapped in a function so the return type is non-optional: TypeScript does
// not carry a module-level narrowing into a function body, so a bare
// `if (!x) throw` above would still leave x possibly undefined inside
// calculateCost.
function resolvePricing(model: string): { input: number; output: number } {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    throw new Error(`No pricing configured for model "${model}" — add it to MODEL_PRICING`);
  }
  return pricing;
}

const PRICE_PER_MILLION = resolvePricing(MODEL);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Without a timeout a hung request holds an Express handler open until the
  // socket dies, which under load is how a server stops responding.
  timeout: 90_000,
  maxRetries: 2,
});

export interface GenerationResult {
  plan: GeneratedMealPlan;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

function calculateCost(promptTokens: number, completionTokens: number): number {
  return (
    (promptTokens / 1_000_000) * PRICE_PER_MILLION.input +
    (completionTokens / 1_000_000) * PRICE_PER_MILLION.output
  );
}

export async function generateMealPlan(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<GeneratedMealPlan> = GeneratedMealPlanSchema
): Promise<GenerationResult> {
  const completion = await client.chat.completions.parse({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(schema, 'meal_plan'),
  });

  const choice = completion.choices[0];
  if (!choice) throw new Error('OpenAI returned no choices');

  // A refusal is a first-class outcome, not an error: the model declined the
  // request rather than failing to answer it.
  if (choice.message.refusal) {
    const error = new Error(`Model refused: ${choice.message.refusal}`);
    error.name = 'ModelRefusalError';
    throw error;
  }

  // Also null if the response was cut off by the token limit, which is why the
  // finish_reason is worth naming in the message.
  const plan = choice.message.parsed;
  if (!plan) {
    throw new Error(`OpenAI returned no parsed content (finish_reason: ${choice.finish_reason})`);
  }

  const promptTokens = completion.usage?.prompt_tokens ?? 0;
  const completionTokens = completion.usage?.completion_tokens ?? 0;

  return {
    plan,
    model: MODEL,
    promptTokens,
    completionTokens,
    costUsd: calculateCost(promptTokens, completionTokens),
  };
}