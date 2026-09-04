import { ArrowRight, Ban, Clock, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ExtrasPicker } from "../components/ExtrasPicker";
import { FlavourPicker } from "../components/FlavourPicker";
import { TopNav } from "../components/navigation/TopNav";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useOnboarding } from "../context/OnboardingContext";
import {
  COMMON_AVOIDANCES,
  COOKING_STYLE_HINTS,
  COOKING_STYLE_LABELS,
  DIET_PRESETS,
} from "../lib/profileOptions";
import { COOKING_STYLES, type CookingStyle } from "../types";
import { useLocale } from "../context/LocaleContext";

export function OnboardingEatingHabitsPage() {
  const navigate = useNavigate();
  const { draft, update } = useOnboarding();
  const { t } = useLocale();
  const [customAvoidance, setCustomAvoidance] = useState("");

  function toggleAvoidance(ingredient: string) {
    const value = ingredient.trim().toLowerCase();
    const selected = draft.avoid_ingredients.includes(value)
      ? draft.avoid_ingredients.filter((entry) => entry !== value)
      : [...draft.avoid_ingredients, value];
    update({ avoid_ingredients: selected });
  }

  // A preset adds its exclusions without removing anything the user chose
  // separately, so ticking Halal after adding "coriander" keeps both.
  function applyPreset(excludes: string[]) {
    update({
      avoid_ingredients: [...new Set([...draft.avoid_ingredients, ...excludes])],
    });
  }

  function addCustomAvoidance(event: FormEvent) {
    event.preventDefault();
    const value = customAvoidance.trim().toLowerCase();
    if (!value || draft.avoid_ingredients.includes(value)) {
      setCustomAvoidance("");
      return;
    }
    update({ avoid_ingredients: [...draft.avoid_ingredients, value] });
    setCustomAvoidance("");
  }

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav backTo="/onboarding/user-info" title="Step 2 of 3" />

        <section className="page-heading">
          <h1>{t("How do you like to cook?")}</h1>
          <p>{t("We will match recipes to the time you actually have.")}</p>
        </section>

        <Card>
          <div className="brand-row">
            <Clock size={18} />
            <strong>{t("Usual cooking time")}</strong>
          </div>
          <div className="form-grid" style={{ marginTop: 16 }}>
            {COOKING_STYLES.map((style) => (
              <button
                className={`choice-pill${draft.cooking_style === style ? " is-selected" : ""}`}
                key={style}
                onClick={() => update({ cooking_style: style as CookingStyle })}
                style={{ textAlign: "left" }}
                type="button"
              >
                <strong>{t(COOKING_STYLE_LABELS[style])}</strong>
                <br />
                <span className="small muted">{t(COOKING_STYLE_HINTS[style])}</span>
              </button>
            ))}
          </div>
        </Card>

        <FlavourPicker
          intensity={draft.seasoning_intensity}
          lowSalt={draft.low_salt}
          lowSugar={draft.low_sugar}
          notes={draft.flavour_notes}
          nutrition={draft.nutrition_focus}
          onChange={update}
        />

        <ExtrasPicker
          frequency={draft.extras_frequency}
          kinds={draft.include_extras}
          lowSugar={draft.low_sugar}
          onChange={update}
        />

        <div className="section-title">
          <h2>{t("Anything to leave out?")}</h2>
        </div>
        <p className="small muted">
          {t("Allergies, dislikes, or anything you do not eat. We only store the ingredients.")}
        </p>

        <Card className="section">
          <span className="eyebrow">{t("Quick presets")}</span>
          <div className="choice-grid" style={{ marginTop: 10 }}>
            {DIET_PRESETS.map((preset) => (
              <button
                className="choice-pill"
                key={preset.label}
                onClick={() => applyPreset(preset.excludes)}
                type="button"
              >
                {t(preset.label)}
              </button>
            ))}
          </div>

          <span className="eyebrow" style={{ display: "block", marginTop: 20 }}>
            {t("Common")}
          </span>
          <div className="choice-grid" style={{ marginTop: 10 }}>
            {COMMON_AVOIDANCES.map((ingredient) => (
              <button
                className={`choice-pill${draft.avoid_ingredients.includes(ingredient) ? " is-selected" : ""}`}
                key={ingredient}
                onClick={() => toggleAvoidance(ingredient)}
                type="button"
              >
                {t(ingredient)}
              </button>
            ))}
          </div>

          <form onSubmit={addCustomAvoidance} style={{ marginTop: 20 }}>
            <Input
              icon={<Ban size={16} />}
              label={t("Something else")}
              maxLength={50}
              onChange={(event) => setCustomAvoidance(event.target.value)}
              placeholder="coriander, celery, offal..."
              value={customAvoidance}
            />
            <Button
              disabled={customAvoidance.trim() === ""}
              fullWidth
              icon={<Plus size={16} />}
              style={{ marginTop: 10 }}
              type="submit"
              variant="secondary"
            >
              {t("Add")}
            </Button>
          </form>

          {draft.avoid_ingredients.length > 0 ? (
            <>
              <span className="eyebrow" style={{ display: "block", marginTop: 20 }}>
                {t("Avoiding")} {draft.avoid_ingredients.length}
              </span>
              <div className="choice-grid" style={{ marginTop: 10 }}>
                {draft.avoid_ingredients.map((ingredient) => (
                  <button
                    className="choice-pill is-selected"
                    key={ingredient}
                    onClick={() => toggleAvoidance(ingredient)}
                    type="button"
                  >
                    {ingredient} <X size={13} />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </Card>

        <div className="footer-actions">
          <Button
            disabled={draft.cooking_style === null}
            fullWidth
            icon={<ArrowRight size={17} />}
            onClick={() => navigate("/onboarding/goals")}
          >
            {t("Continue")}
          </Button>
        </div>
      </div>
    </main>
  );
}
