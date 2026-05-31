const { generateMealPlan } = require("../services/openai");

async function createMealPlan(req, res) {
  try {
    const { culture, goal, budget, ingredients } = req.body;

    const prompt = `
You are Mosaic Kitchen, an AI meal planning assistant for multicultural households in the UK.

Create a 3-day meal plan based on the following user preferences:

Culture / Cuisine: ${culture || "Chinese"}
Goal: ${goal || "healthy eating"}
Budget: ${budget || "£30"}
Available ingredients: ${(ingredients || []).join(", ")}

Return the result as clear JSON only, with:
- mealPlan
- shoppingList
- estimatedCost
- wasteReductionTip
`;

    const mealPlan = await generateMealPlan(prompt);

    res.json({
      message: "Meal plan generated successfully",
      mealPlan,
    });
  } catch (error) {
    console.error("Meal plan error:", error);

    res.status(500).json({
      error: "Failed to generate meal plan",
    });
  }
}

module.exports = {
  createMealPlan,
};