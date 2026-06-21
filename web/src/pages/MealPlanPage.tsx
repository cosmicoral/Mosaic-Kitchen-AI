import { ChevronDown, ChevronRight, ShoppingCart, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useToast } from "../components/ui/Toast";
import { mealPlan } from "../data/mockData";

export function MealPlanPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [openDay, setOpenDay] = useState(0);

  const fallbackMeals = [
    {
      type: "Breakfast",
      cuisine: "Chinese",
      name: "Soy Egg Rice Bowl",
      time: "15 min",
      cost: "£2.20",
    },
    {
      type: "Lunch",
      cuisine: "British",
      name: "Roasted Veg Wrap",
      time: "20 min",
      cost: "£3.10",
    },
    {
      type: "Dinner",
      cuisine: "Indian",
      name: "Spinach Chickpea Curry",
      time: "30 min",
      cost: "£4.80",
    },
  ];

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav
          backTo="/dashboard"
          onRightAction={() => showToast("Meal plan share link copied")}
          rightLabel="Share"
          title="Your Meal Plan"
        />

        <section className="page-heading">
          <h1>Your Weekly Meal Plan</h1>
          <p>Personalized for your household. Week of Jun 9.</p>
        </section>

        <section className="section plan-summary">
          <Card variant="dark">
            <Badge variant="dark">
              <Sparkles size={14} /> AI Summary
            </Badge>
            <h2>Great balance this week.</h2>
            <p className="small">
              Your plan covers Chinese, British, Indian and Japanese cuisines. High in protein on Tuesday
              and Friday. Under budget by £12.40.
            </p>
            <div className="choice-grid">
              <Badge variant="cream">High Protein</Badge>
              <Badge variant="cream">Under Budget</Badge>
              <Badge variant="cream">5 Cuisines</Badge>
            </div>
          </Card>

          <div className="metric-grid">
            <Card className="stat-card">
              <strong>£83</strong>
              <span className="tiny muted">Weekly budget</span>
            </Card>
            <Card className="stat-card">
              <strong>87/100</strong>
              <span className="tiny muted">Health score</span>
            </Card>
            <Card className="stat-card">
              <strong>72%</strong>
              <span className="tiny muted">Waste reduced</span>
            </Card>
          </div>
        </section>

        <div className="section-title">
          <h2>Daily Meals</h2>
        </div>

        <section className="form-grid">
          {mealPlan.map((day, index) => (
            <button
              className={`day-card${openDay === index ? " is-open" : ""}`}
              key={day.day}
              onClick={() => setOpenDay((current) => (current === index ? -1 : index))}
              type="button"
            >
              <div className="day-head">
                <span className="day-badge">{day.short}</span>
                <span>
                  <strong>{day.day}</strong>
                  <br />
                  <span className="small muted">3 meals - {day.cost}</span>
                </span>
                {openDay === index ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
              {openDay === index ? (
                <div className="day-meals">
                  {(day.meals.length ? day.meals : fallbackMeals).map((meal) => (
                    <div className="daily-meal" key={meal.name}>
                      <Badge variant={meal.type === "Breakfast" ? "gold" : meal.type === "Lunch" ? "blue" : "green"}>
                        {meal.type}
                      </Badge>{" "}
                      <span className="tiny muted">{meal.cuisine}</span>
                      <strong style={{ display: "block", marginTop: 6 }}>{meal.name}</strong>
                      <span className="small muted">
                        {meal.time} - <strong style={{ color: "var(--color-primary-deep)" }}>{meal.cost}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </button>
          ))}
        </section>

        <div className="footer-actions" style={{ gridTemplateColumns: "1fr" }}>
          <Button
            fullWidth
            icon={<ShoppingCart size={18} />}
            onClick={() => navigate("/shopping-list")}
          >
            Generate Shopping List
          </Button>
          <span className="tiny muted" style={{ textAlign: "center" }}>
            Optimized for your local supermarket
          </span>
        </div>
      </div>
    </main>
  );
}
