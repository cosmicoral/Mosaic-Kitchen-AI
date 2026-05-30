const express = require("express");
const { createMealPlan } = require("../controllers/mealPlanController");

const router = express.Router();

router.post("/", createMealPlan);

module.exports = router;