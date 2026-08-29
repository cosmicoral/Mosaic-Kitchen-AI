import { Check, MapPin, Sparkles, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";
import { useOnboarding } from "../context/OnboardingContext";
import {
  COOKING_STYLE_LABELS,
  CUISINE_LABELS,
  PRIORITY_LABELS,
} from "../lib/profileOptions";
import { PRIORITIES, type Priority } from "../types";

const MEAL_OPTIONS = [3, 5, 7, 14, 21];
const MAX_PRIORITIES = 3;

export function OnboardingGoalsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { draft, update, submit } = useOnboarding();

  const [budgetText, setBudgetText] = useState(
    draft.weekly_budget === null ? "" : String(draft.weekly_budget)
  );
  const [postcodeText, setPostcodeText] = useState(draft.postcode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Capped: asking someone to rank everything as important tells the planner
  // nothing. Three forces a real trade-off.
  function togglePriority(priority: Priority) {
    if (draft.priorities.includes(priority)) {
      update({ priorities: draft.priorities.filter((entry) => entry !== priority) });
      return;
    }
    if (draft.priorities.length >= MAX_PRIORITIES) {
      showToast(`Pick up to ${MAX_PRIORITIES} priorities`);
      return;
    }
    update({ priorities: [...draft.priorities, priority] });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Written into the draft only at submit time: keeping every keystroke in
      // context state would rerender all three screens on each character.
      await submit();
      navigate("/dashboard", { replace: true });
      showToast("Your preferences are saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your preferences");
    } finally {
      setSubmitting(false);
    }
  }

  function commitBudget(value: string) {
    setBudgetText(value);
    const trimmed = value.trim();
    update({ weekly_budget: trimmed === "" ? null : Number(trimmed) });
  }

  function commitPostcode(value: string) {
    setPostcodeText(value);
    update({ postcode: value.trim() === "" ? null : value.trim() });
  }

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav backTo="/onboarding/eating-habits" title="Step 3 of 3" />

        <section className="page-heading">
          <h1>What matters most?</h1>
          <p>Pick up to three. We use them to break ties when planning.</p>
        </section>

        <form onSubmit={handleSubmit}>
          <Card>
            <div className="choice-grid">
              {PRIORITIES.map((priority) => (
                <button
                  className={`choice-pill${draft.priorities.includes(priority) ? " is-selected" : ""}`}
                  key={priority}
                  onClick={() => togglePriority(priority)}
                  type="button"
                >
                  {PRIORITY_LABELS[priority]}
                </button>
              ))}
            </div>
          </Card>

          <div className="section-title">
            <h2>Meals per week</h2>
          </div>
          <Card>
            <div className="choice-grid">
              {MEAL_OPTIONS.map((count) => (
                <button
                  className={`choice-pill${draft.meals_per_week === count ? " is-selected" : ""}`}
                  key={count}
                  onClick={() => update({ meals_per_week: count })}
                  type="button"
                >
                  {count} meals
                </button>
              ))}
            </div>
          </Card>

          <div className="section-title">
            <h2>Budget and location</h2>
          </div>
          <Card>
            <div className="form-grid">
              <Input
                helper="Roughly what you spend on groceries each week."
                icon={<Wallet size={16} />}
                label="Weekly budget (£, optional)"
                min="0"
                onChange={(event) => commitBudget(event.target.value)}
                placeholder="80"
                step="0.01"
                type="number"
                value={budgetText}
              />
              <Input
                helper="Only used later to show prices and shops near you. Optional."
                icon={<MapPin size={16} />}
                label="Postcode (optional)"
                maxLength={8}
                onChange={(event) => commitPostcode(event.target.value)}
                placeholder="SW1A 1AA"
                value={postcodeText}
              />
            </div>
          </Card>

          <Card className="section" variant="soft">
            <div className="brand-row">
              <Sparkles size={18} />
              <strong>Your setup</strong>
            </div>
            <div className="form-grid" style={{ marginTop: 12 }}>
              {[
                ["Household", `${draft.adults + draft.teenagers + draft.children + draft.toddlers} people`],
                ["Cuisines", draft.cuisines.map((c) => CUISINE_LABELS[c]).join(", ") || "Not set"],
                ["Cooking", draft.cooking_style ? COOKING_STYLE_LABELS[draft.cooking_style] : "Not set"],
                ["Avoiding", draft.avoid_ingredients.join(", ") || "Nothing"],
                ["Meals", `${draft.meals_per_week} per week`],
              ].map(([label, value]) => (
                <div className="check-item" key={label}>
                  <span className="small muted">{label}</span>
                  <span className="small">
                    <strong>{value}</strong>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {error ? (
            <p className="small" role="alert" style={{ color: "var(--danger, #c0392b)", marginTop: 10 }}>
              {error}
            </p>
          ) : null}

          <div className="footer-actions">
            <Button disabled={submitting} fullWidth icon={<Check size={17} />} type="submit">
              {submitting ? "Saving…" : "Finish setup"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
