function createMealPlan(req, res) {
  const { culture, goal, budget, ingredients } = req.body;

  res.json({
    message: "Meal plan generated successfully",
    input: {
      culture,
      goal,
      budget,
      ingredients,
    },
    mealPlan: [
      {
        name: "Tomato egg stir-fry",
        culture: culture || "Chinese",
        goal: goal || "healthy",
        estimatedCost: "£3.50",
        usesIngredients: ["eggs", "tomatoes"],
      },
      {
        name: "Tofu and spinach soup",
        culture: culture || "Chinese",
        goal: goal || "healthy",
        estimatedCost: "£2.80",
        usesIngredients: ["tofu", "spinach"],
      },
    ],
    shoppingList: ["tomatoes", "tofu", "spring onion"],
    wasteReductionTip: "Use spinach within 48 hours to avoid waste.",
  });
}

module.exports = { createMealPlan };