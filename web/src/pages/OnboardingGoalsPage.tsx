import { Check, Sparkles, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useLocale } from "../context/LocaleContext";

const MEAL_OPTIONS = [3, 5, 7, 14, 21];
const MAX_PRIORITIES = 3;

export function OnboardingGoalsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { draft, update, submit } = useOnboarding();
  const { t } = useLocale();

  const [budgetText, setBudgetText] = useState(
    draft.weekly_budget === null ? "" : String(draft.weekly_budget)
  );
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


  return (
    <main className="app-shell">
      <div className="page">
        <TopNav backTo="/onboarding/eating-habits" title="Step 3 of 3" />

        <section className="page-heading">
          <h1>{t("What matters most?")}</h1>
          <p>{t("Pick up to three. We use them to break ties when planning.")}</p>
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
                  {t(PRIORITY_LABELS[priority])}
                </button>
              ))}
            </div>
          </Card>

          <div className="section-title">
            <h2>{t("Meals per week")}</h2>
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
                  {count} {t("meals")}
                </button>
              ))}
            </div>
          </Card>

          <div className="section-title">
            <h2>{t("Budget and location")}</h2>
          </div>
          <Card>
            <div className="form-grid">
              <Input
                helper="Roughly what you spend on groceries each week."
                icon={<Wallet size={16} />}
                label={t("Weekly budget (£, optional)")}
                min="0"
                onChange={(event) => commitBudget(event.target.value)}
                placeholder="80"
                step="0.01"
                type="number"
                value={budgetText}
              />
            </div>
          </Card>

          <Card className="section" variant="soft">
            <div className="brand-row">
              <Sparkles size={18} />
              <strong>{t("Your setup")}</strong>
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
                  <span className="small muted">{t(label)}</span>
                  <span className="small">
                    <strong>{value}</strong>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/*
            UK GDPR Article 9(2)(a). What this screen has just collected —
            allergies, low-salt or low-sugar needs, and a cuisine list that
            beside a religious exclusion implies a belief — is special category
            data, which may not be processed at all without explicit consent.

            Deliberately its own checkbox rather than a line inside a terms
            acceptance. "Explicit" means specific and affirmative: a consent
            bundled with eight other things is not evidence that anyone agreed
            to this one. Unticked on arrival, for the same reason.
          */}
          <Card className="section" variant="soft">
            <label className="check-item" style={{ alignItems: "flex-start", cursor: "pointer" }}>
              <input
                checked={draft.data_consent}
                onChange={(event) => update({ data_consent: event.target.checked })}
                style={{ marginTop: 3 }}
                type="checkbox"
              />
              <span className="small" style={{ marginLeft: 10 }}>
                {t(
                  "I agree to Mosaic Kitchen using my dietary requirements, allergies and food preferences to generate meal plans for me."
                )}
                <br />
                <span className="muted">
                  {t(
                    "This information can reveal health conditions and religious beliefs, so we ask separately. You can withdraw it at any time by deleting your profile."
                  )}{" "}
                  <Link to="/privacy">{t("How we handle your data")}</Link>
                </span>
              </span>
            </label>
          </Card>

          {error ? (
            <p className="small" role="alert" style={{ color: "var(--danger, #c0392b)", marginTop: 10 }}>
              {error}
            </p>
          ) : null}

          <div className="footer-actions">
            {/*
              Disabled without consent, rather than letting the request go and
              bounce back with CONSENT_REQUIRED. The server check stays — it is
              the one that actually enforces this — but a form that visibly
              cannot be submitted explains itself better than an error message
              appearing after a page-length scroll back up.
            */}
            <Button
              disabled={submitting || !draft.data_consent}
              fullWidth
              icon={<Check size={17} />}
              type="submit"
            >
              {submitting ? t("Saving…") : t("Finish setup")}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
