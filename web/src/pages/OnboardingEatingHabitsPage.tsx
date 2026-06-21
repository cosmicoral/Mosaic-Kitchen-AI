import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";

function ProgressHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="progress-header">
      <div className="progress-header__top">
        <button className="top-nav__back" onClick={onBack} type="button">
          Back
        </button>
        <span className="small muted">2 of 3</span>
      </div>
      <div className="progress-track">
        <span className="progress-segment is-complete" />
        <span className="progress-segment is-complete" />
        <span className="progress-segment" />
      </div>
    </div>
  );
}

export function OnboardingEatingHabitsPage() {
  const navigate = useNavigate();
  const eatingStyles = ["Mostly cook at home", "Mixed cooking and takeaway", "Mostly takeaway", "Meal prep"];
  const mealPreferenceOptions = ["Quick lunches", "Warm breakfasts", "Family dinners", "One-pot meals", "Leftover friendly", "High protein"];
  const avoidOptions = ["Pork", "Beef", "Shellfish", "Peanuts", "Mushrooms"];
  const shoppingOptions = ["Weekly supermarket", "Local Asian stores", "Online groceries", "Top-up shops"];
  const [eatingStyle, setEatingStyle] = useState("Mostly cook at home");
  const [mealPreferences, setMealPreferences] = useState(["Quick lunches", "Warm breakfasts", "Family dinners"]);
  const [avoidIngredients, setAvoidIngredients] = useState<string[]>([]);
  const [shoppingHabits, setShoppingHabits] = useState(["Weekly supermarket"]);

  const toggleSelection = (
    value: string,
    selected: string[],
    setSelected: (value: string[]) => void,
  ) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <main className="app-shell">
      <div className="page">
        <ProgressHeader onBack={() => navigate("/onboarding/user-info")} />

        <section className="auth-head">
          <MascotAvatar size="md" />
          <h1>Tell us about your eating habits</h1>
          <p>We will tune meal ideas around your real week.</p>
        </section>

        <section className="section">
          <Card>
            <h2>How do you usually eat?</h2>
            <div className="choice-grid" style={{ marginTop: 14 }}>
              {eatingStyles.map((item) => (
                <button
                  className={`choice-pill${eatingStyle === item ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => setEatingStyle(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2>Meal preferences</h2>
            <div className="choice-grid" style={{ marginTop: 14 }}>
              {mealPreferenceOptions.map((item) => (
                <button
                  className={`choice-pill${mealPreferences.includes(item) ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => toggleSelection(item, mealPreferences, setMealPreferences)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2>Ingredients to avoid</h2>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <Input placeholder="Search ingredients..." />
            </div>
            <div className="choice-grid" style={{ marginTop: 14 }}>
              {avoidOptions.map((item) => (
                <button
                  className={`choice-pill${avoidIngredients.includes(item) ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => toggleSelection(item, avoidIngredients, setAvoidIngredients)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2>Shopping habits</h2>
            <div className="two-col" style={{ marginTop: 14 }}>
              {shoppingOptions.map((item) => (
                <button
                  className={`select-card${shoppingHabits.includes(item) ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => toggleSelection(item, shoppingHabits, setShoppingHabits)}
                  type="button"
                >
                  <strong>{item}</strong>
                  <br />
                  <span className="tiny muted">{shoppingHabits.includes(item) ? "Selected" : "Tap to select"}</span>
                </button>
              ))}
            </div>
          </Card>
        </section>

        <Button fullWidth onClick={() => navigate("/onboarding/goals")} style={{ marginTop: 22 }}>
          Continue
        </Button>
      </div>
    </main>
  );
}
