import type { Request, Response } from 'express';
import { generateMealPlan } from '../services/openai.ts';

// NOTE: this controller still has no input validation and no auth — see the
// repo audit. It is rewritten in the meal-plan vertical slice.
export async function createMealPlan(req: Request, res: Response) {
  try {
    const { culture, goal, budget, ingredients } = req.body;

    const prompt = `
You are Mosaic Kitchen, an AI meal planning assistant for multicultural households in the UK.

Create a 3-day meal plan based on the following user preferences:

Culture / Cuisine: ${culture || 'Chinese'}
Goal: ${goal || 'healthy eating'}
Budget: ${budget || '£30'}
Available ingredients: ${(ingredients || []).join(', ')}

Return the result as clear JSON only, with:
- mealPlan
- shoppingList
- estimatedCost
- wasteReductionTip
`;

    const mealPlan = await generateMealPlan(prompt);

    res.json({
      message: 'Meal plan generated successfully',
      mealPlan,
    });
  } catch (error) {
    console.error('Meal plan error:', error);

    res.status(500).json({
      error: 'Failed to generate meal plan',
    });
  }
}
