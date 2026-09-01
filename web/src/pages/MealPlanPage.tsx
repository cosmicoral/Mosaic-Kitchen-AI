import {
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useToast } from "../components/ui/Toast";
import { useMealPlan } from "../hooks/useMealPlan";
import {
  SLOT_LABELS,
  SLOT_TONES,
  dayCost,
  dayLabels,
  pantryUsageRatio,
  totalMeals,
  uniqueCuisines,
} from "../lib/mealPlanFormat";

export function MealPlanPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { plan, quota, status, error, refresh, generate, generating, generationError } =
    useMealPlan();

  const [openDay, setOpenDay] = useState<number | null>(0);
  const [openMeal, setOpenMeal] = useState<string | null>(null);

  async function handleGenerate() {
    const created = await generate();
    if (created) {
      setOpenDay(0);
      showToast("Your new plan is ready");
    }
  }

  const record = plan;
  const generated = record?.plan;

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav backTo="/dashboard" title="Your Meal Plan" />

        <section className="page-heading">
          <h1>Your Weekly Meal Plan</h1>
          {quota ? (
            <p>
              {quota.remaining} of {quota.limit} plans left this month.
            </p>
          ) : null}
        </section>

        {status === "loading" ? (
          <Card>
            <div className="brand-row">
              <Loader2 size={18} />
              <span className="small muted">Loading your plan…</span>
            </div>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card>
            <strong>Could not load your meal plan</strong>
            <p className="small muted">{error}</p>
            <Button icon={<RefreshCw size={16} />} onClick={() => void refresh()} variant="secondary">
              Try again
            </Button>
          </Card>
        ) : null}

        {/* Generation takes 20 to 60 seconds, which is long enough that silence
            reads as a broken page. */}
        {generating ? (
          <Card variant="dark">
            <div className="brand-row">
              <Loader2 size={18} />
              <strong>Building your plan…</strong>
            </div>
            <p className="small">
              Checking your pantry, working around what you avoid, and staying in budget. This
              usually takes under a minute.
            </p>
          </Card>
        ) : null}

        {generationError ? (
          <Card>
            <strong>Could not generate a plan</strong>
            <p className="small muted">{generationError.message}</p>
            {/* Each failure has a different useful next step, chosen by code
                rather than by reading the message. */}
            {generationError.code === "PROFILE_REQUIRED" ? (
              <Button fullWidth onClick={() => navigate("/onboarding/user-info")}>
                Set up preferences
              </Button>
            ) : generationError.code === "QUOTA_EXCEEDED" ? (
              <Button fullWidth onClick={() => navigate("/pricing")} variant="premium">
                See Premium plans
              </Button>
            ) : (
              <Button fullWidth onClick={() => void handleGenerate()} variant="secondary">
                Try again
              </Button>
            )}
          </Card>
        ) : null}

        {status === "ready" && !record && !generating ? (
          <Card>
            <div className="brand-row">
              <Sparkles size={18} />
              <strong>No plan yet</strong>
            </div>
            <p className="small muted">
              Generate one and we will build it around what is already in your kitchen.
            </p>
            <Button
              disabled={quota?.remaining === 0}
              fullWidth
              icon={<Sparkles size={17} />}
              onClick={() => void handleGenerate()}
              style={{ marginTop: 12 }}
            >
              {quota?.remaining === 0 ? "No plans left this month" : "Generate my plan"}
            </Button>
          </Card>
        ) : null}

        {record && generated ? (
          <>
            <section className="section plan-summary">
              <Card variant="dark">
                <Badge variant="dark">
                  <Sparkles size={14} /> AI Summary
                </Badge>
                <h2 style={{ marginTop: 8 }}>{generated.summary}</h2>
                <div className="choice-grid" style={{ marginTop: 12 }}>
                  <Badge variant="cream">{totalMeals(generated)} meals</Badge>
                  <Badge variant="cream">{uniqueCuisines(generated).length} cuisines</Badge>
                  <Badge variant="cream">{pantryUsageRatio(generated)}% from pantry</Badge>
                </div>
              </Card>

              <div className="metric-grid">
                <Card className="stat-card">
                  <strong>£{generated.estimated_total_gbp.toFixed(2)}</strong>
                  <span className="tiny muted">Estimated cost</span>
                </Card>
                <Card className="stat-card">
                  <strong>
                    {record.profile_snapshot.weekly_budget
                      ? `£${Number(record.profile_snapshot.weekly_budget).toFixed(2)}`
                      : "—"}
                  </strong>
                  <span className="tiny muted">Your budget</span>
                </Card>
                <Card className="stat-card">
                  <strong>{pantryUsageRatio(generated)}%</strong>
                  <span className="tiny muted">Already owned</span>
                </Card>
              </div>

              {generated.waste_reduction_tip ? (
                <Card variant="soft">
                  <span className="eyebrow">Tip</span>
                  <p className="small" style={{ margin: 0 }}>
                    {generated.waste_reduction_tip}
                  </p>
                </Card>
              ) : null}
            </section>

            <div className="section-title">
              <h2>Daily Meals</h2>
              <button
                className="top-nav__right"
                disabled={generating || quota?.remaining === 0}
                onClick={() => void handleGenerate()}
                type="button"
              >
                Regenerate
              </button>
            </div>

            <section className="form-grid">
              {generated.days.map((day) => {
                const labels = dayLabels(record.starts_on, day.day_index);
                const isOpen = openDay === day.day_index;

                return (
                  <Card className={`day-card${isOpen ? " is-open" : ""}`} key={day.day_index}>
                    <button
                      onClick={() => setOpenDay(isOpen ? null : day.day_index)}
                      style={{ all: "unset", cursor: "pointer", width: "100%" }}
                      type="button"
                    >
                      <div className="day-head">
                        <span className="day-badge">{labels.short}</span>
                        <span>
                          <strong>{labels.full}</strong>
                          <br />
                          <span className="small muted">
                            {day.meals.length} {day.meals.length === 1 ? "meal" : "meals"} · £
                            {dayCost(generated, day.day_index).toFixed(2)}
                          </span>
                        </span>
                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="day-meals">
                        {day.meals.map((meal) => {
                          const mealKey = `${day.day_index}-${meal.slot}`;
                          const showRecipe = openMeal === mealKey;

                          return (
                            <div className="daily-meal" key={mealKey}>
                              <Badge variant={SLOT_TONES[meal.slot]}>{SLOT_LABELS[meal.slot]}</Badge>{" "}
                              <span className="tiny muted">{meal.cuisine}</span>

                              <strong style={{ display: "block", marginTop: 6 }}>{meal.name}</strong>
                              {meal.native_name && meal.native_name !== meal.name ? (
                                <span className="small muted">{meal.native_name}</span>
                              ) : null}

                              <span className="small muted">
                                <Clock size={13} /> {meal.minutes} min · <Users size={13} />{" "}
                                {meal.servings} servings ·{" "}
                                <strong style={{ color: "var(--color-primary-deep)" }}>
                                  £{meal.estimated_cost_gbp.toFixed(2)}
                                </strong>
                              </span>

                              <button
                                className="text-link small"
                                onClick={() => setOpenMeal(showRecipe ? null : mealKey)}
                                style={{ display: "block", marginTop: 6 }}
                                type="button"
                              >
                                {showRecipe ? "Hide recipe" : "Show recipe"}
                              </button>

                              {showRecipe ? (
                                <div style={{ marginTop: 10 }}>
                                  <span className="eyebrow">Ingredients</span>
                                  <ul className="check-list" style={{ marginTop: 6 }}>
                                    {meal.ingredients.map((ingredient) => (
                                      <li key={ingredient.name}>
                                        <span className="small">
                                          {ingredient.quantity}
                                          {ingredient.unit} {ingredient.name}
                                        </span>
                                        {/* Worth surfacing: it is the whole
                                            point of sending the pantry to the
                                            model. */}
                                        {ingredient.from_pantry ? (
                                          <Badge variant="green">Have it</Badge>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>

                                  <span className="eyebrow" style={{ display: "block", marginTop: 12 }}>
                                    Method
                                  </span>
                                  <ol className="small" style={{ marginTop: 6, paddingLeft: 18 }}>
                                    {meal.steps.map((step, index) => (
                                      <li key={index} style={{ marginBottom: 6 }}>
                                        {step}
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </section>

            <div className="footer-actions" style={{ gridTemplateColumns: "1fr" }}>
              <Button
                fullWidth
                icon={<ShoppingCart size={18} />}
                onClick={() => navigate("/shopping-list")}
              >
                Generate Shopping List
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
