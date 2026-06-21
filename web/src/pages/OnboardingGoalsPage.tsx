import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MascotAvatar } from "../components/ui/MascotAvatar";

function ProgressHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="progress-header">
      <div className="progress-header__top">
        <button className="top-nav__back" onClick={onBack} type="button">
          Back
        </button>
        <span className="small muted">Step 3 of 3</span>
      </div>
      <div className="progress-track">
        <span className="progress-segment is-complete" />
        <span className="progress-segment is-complete" />
        <span className="progress-segment is-complete" />
      </div>
    </div>
  );
}

export function OnboardingGoalsPage() {
  const navigate = useNavigate();
  const goals = [
    "Save Money",
    "Eat Healthier",
    "Reduce Food Waste",
    "Lose Weight",
    "Gain Muscle",
    "Family Friendly",
    "Quick and Easy",
    "Explore Cuisines",
    "Heart Healthy",
    "Diabetes Friendly",
  ];
  const mealOptions = ["3 meals", "5 meals", "7 meals", "14 meals"];
  const priorityOptions = ["Taste", "Health", "Budget", "Convenience", "Food Waste Reduction", "Cultural Authenticity", "Family Needs"];
  const [selectedGoals, setSelectedGoals] = useState(["Save Money", "Eat Healthier", "Reduce Food Waste"]);
  const [selectedMeals, setSelectedMeals] = useState("7 meals");
  const [selectedPriorities, setSelectedPriorities] = useState(["Budget", "Cultural Authenticity"]);

  const toggleSelection = (value: string, selected: string[], setSelected: (value: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <main className="app-shell">
      <div className="page">
        <ProgressHeader onBack={() => navigate("/onboarding/eating-habits")} />

        <section className="auth-head">
          <MascotAvatar size="md" />
          <h1>What are your goals?</h1>
          <p>Help us craft a meal plan that truly fits you.</p>
        </section>

        <section className="section">
          <Card>
            <h2>Meal Planning Goals</h2>
            <p className="small muted">Select all that apply.</p>
            <div className="choice-grid" style={{ marginTop: 14 }}>
              {goals.map((goal) => (
                <button
                  className={`choice-pill${selectedGoals.includes(goal) ? " is-selected" : ""}`}
                  key={goal}
                  onClick={() => toggleSelection(goal, selectedGoals, setSelectedGoals)}
                  type="button"
                >
                  {goal}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2>Weekly Food Budget</h2>
            <p className="small muted">How much do you usually spend on food each week?</p>
            <div style={{ padding: "24px 0 10px", textAlign: "center" }}>
              <strong style={{ color: "var(--color-forest)", fontSize: "2.4rem" }}>£80</strong>
              <br />
              <span className="small muted">per week</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "#e4ebdc" }}>
              <div style={{ width: "28%", height: "100%", borderRadius: 999, background: "var(--color-primary)" }} />
            </div>
            <div className="premium-strip tiny muted" style={{ marginTop: 8 }}>
              <span>£20</span>
              <span>£300+</span>
            </div>
          </Card>

          <Card>
            <h2>Meals to Plan</h2>
            <p className="small muted">How many meals would you like us to plan?</p>
            <div className="two-col" style={{ marginTop: 14 }}>
              {mealOptions.map((item) => (
                <button
                  className={`select-card${selectedMeals === item ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => setSelectedMeals(item)}
                  type="button"
                >
                  <strong>{item}</strong>
                  <br />
                  <span className="tiny muted">{selectedMeals === item ? "Selected" : "Tap to select"}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2>Meal Planning Priorities</h2>
            <p className="small muted">Select what matters most to you.</p>
            <div className="choice-grid" style={{ marginTop: 14 }}>
              {priorityOptions.map((item) => (
                <button
                  className={`choice-pill${selectedPriorities.includes(item) ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => toggleSelection(item, selectedPriorities, setSelectedPriorities)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>

          <Card variant="soft">
            <h2>Review Summary</h2>
            <div className="summary-list">
              {[
                ["Household Size", "2 people"],
                ["Food Cultures", "Chinese, British"],
                ["Dietary Requirements", "Halal"],
                ["Eating Habits", "Mostly Cook at Home"],
                ["Weekly Budget", "£80"],
              ].map(([label, value]) => (
                <div className="summary-row" key={label}>
                  <span className="small muted">{label}</span>
                  <strong className="small">{value}</strong>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Button
          fullWidth
          icon={<Sparkles size={18} />}
          onClick={() => navigate("/meal-plan")}
          style={{ marginTop: 22 }}
        >
          Generate My Meal Plan
        </Button>
        <p className="tiny muted" style={{ textAlign: "center" }}>
          Your personalized plan is generated securely using AI.
        </p>
      </div>
    </main>
  );
}
