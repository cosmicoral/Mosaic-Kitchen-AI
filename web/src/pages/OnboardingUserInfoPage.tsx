import { ArrowRight, Minus, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../components/navigation/TopNav";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useOnboarding } from "../context/OnboardingContext";
import { CUISINE_LABELS } from "../lib/profileOptions";
import { CUISINES, type Cuisine, type UserProfileInput } from "../types";
import { useLocale } from "../context/LocaleContext";

// Each band feeds the plan differently, so the copy has to make the age
// boundaries unambiguous — nobody guesses where "child" ends.
const HOUSEHOLD_BANDS: Array<{
  key: 'adults' | 'teenagers' | 'children' | 'toddlers';
  label: string;
  hint: string;
}> = [
  { key: 'adults', label: 'Adults', hint: '18 and over' },
  { key: 'teenagers', label: 'Teenagers', hint: '13 to 17' },
  { key: 'children', label: 'Children', hint: '5 to 12' },
  { key: 'toddlers', label: 'Toddlers', hint: '1 to 4' },
];

export function OnboardingUserInfoPage() {
  const navigate = useNavigate();
  const { draft, update } = useOnboarding();
  const { t } = useLocale();

  const householdTotal =
    draft.adults + draft.teenagers + draft.children + draft.toddlers;

  function step(key: (typeof HOUSEHOLD_BANDS)[number]['key'], delta: number) {
    // Clamped to the same range the database CHECK enforces, so the UI can
    // never produce a value the API will reject.
    const next = Math.min(20, Math.max(0, draft[key] + delta));
    update({ [key]: next } as Partial<UserProfileInput>);
  }

  function toggleCuisine(cuisine: Cuisine) {
    const selected = draft.cuisines.includes(cuisine)
      ? draft.cuisines.filter((entry) => entry !== cuisine)
      : [...draft.cuisines, cuisine];
    update({ cuisines: selected });
  }

  const canContinue = householdTotal >= 1 && draft.cuisines.length > 0;

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav backTo="/signup" title="Step 1 of 3" />

        <section className="page-heading">
          <h1>{t("Who are you cooking for?")}</h1>
          <p>{t("This sets portion sizes and keeps meals suitable for everyone at the table.")}</p>
        </section>

        <Card>
          <div className="brand-row">
            <Users size={18} />
            <strong>{t("Household")}</strong>
          </div>

          <div className="form-grid" style={{ marginTop: 16 }}>
            {HOUSEHOLD_BANDS.map((band) => (
              <div className="check-item" key={band.key}>
                <span>
                  <strong>{t(band.label)}</strong>
                  <br />
                  <span className="small muted">{t(band.hint)}</span>
                </span>
                <div className="stepper">
                  <button
                    aria-label={`Fewer ${band.label.toLowerCase()}`}
                    className="icon-only"
                    disabled={draft[band.key] === 0}
                    onClick={() => step(band.key, -1)}
                    type="button"
                  >
                    <Minus size={16} />
                  </button>
                  <strong style={{ minWidth: 24, textAlign: "center" }}>
                    {draft[band.key]}
                  </strong>
                  <button
                    aria-label={`More ${band.label.toLowerCase()}`}
                    className="icon-only"
                    disabled={draft[band.key] === 20}
                    onClick={() => step(band.key, 1)}
                    type="button"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="small muted" style={{ marginTop: 12 }}>
            {householdTotal === 0
              ? t("Add at least one person.")
              : `${householdTotal} ${t(householdTotal === 1 ? "person" : "people")}`}
          </p>
        </Card>

        <div className="section-title">
          <h2>{t("Which cuisines do you cook?")}</h2>
        </div>
        <p className="small muted">
          {t("Pick as many as you like. We use these to choose recipes, not to guess anything about you.")}
        </p>

        <Card className="section">
          <div className="choice-grid">
            {CUISINES.map((cuisine) => (
              <button
                className={`choice-pill${draft.cuisines.includes(cuisine) ? " is-selected" : ""}`}
                key={cuisine}
                onClick={() => toggleCuisine(cuisine)}
                type="button"
              >
                {t(CUISINE_LABELS[cuisine])}
              </button>
            ))}
          </div>
        </Card>

        <div className="footer-actions">
          <Button
            disabled={!canContinue}
            fullWidth
            icon={<ArrowRight size={17} />}
            onClick={() => navigate("/onboarding/eating-habits")}
          >
            {t("Continue")}
          </Button>
        </div>
      </div>
    </main>
  );
}
