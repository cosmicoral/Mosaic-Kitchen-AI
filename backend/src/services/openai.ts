import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateMealPlan(prompt: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // choices can be empty and content can be null; failing loudly here beats a
  // confusing TypeError further downstream.
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned no content');
  }

  return content;
}
