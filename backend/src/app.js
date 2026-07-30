require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mealPlanRouter = require("./routes/mealPlan");
const authRouter = require("./routes/auth");

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

app.get("/", (req, res) => {
  res.json({ message: "Mosaic Kitchen API is running" });
});

app.use("/api/meal-plan", mealPlanRouter);

module.exports = app;