import { Check } from "lucide-react";
import { Card } from "./ui/Card";
import { ChefStage } from "./ChefStage";
import { useLocale } from "../context/LocaleContext";
import { GENERATION_STAGES, type InsightEvent, type StageEvent } from "../lib/mealPlanStream";

// Wording lives here, not in the API. The server sends stage identifiers and
// insight values so every user-facing string stays translatable.
const STAGE_LABELS: Record<string, string> = {
  analysing_profile: "Reading your preferences",
  checking_pantry: "Checking what you already have",
  building_meals: "Building your week",
  reviewing: "Checking allergens, cuisines and budget",
  finalising: "Finishing your plan",
};

// Each takes the values the server measured and puts them in a sentence. No
// insight is rendered unless its event arrived, so nothing here can appear
// for a household it is not true of.
function insightText(
  insight: InsightEvent,
  t: (key: string) => string
): string | null {
  const { key, data } = insight;

  switch (key) {
    case "profile_signals":
      return `${t("Planning around")} ${data.count} ${t("things you told us")}`;
    case "pantry_reusable":
      return `${data.count} ${t("ingredients already in your kitchen")}`;
    case "pantry_empty":
      return t("Your pantry is empty, so everything is on the shopping list");
    case "expiry_soonest":
      return Number(data.days) <= 0
        ? `${data.name} — ${t("using it first")}`
        : `${data.name} ${t("expires in")} ${data.days} ${t("days — using it first")}`;
    case "budget_target":
      return `${t("Keeping within")} £${Number(data.amount).toFixed(0)}`;
    case "culture_regions":
      return Array.isArray(data.list)
        ? `${t("Cooking this week")} ${data.list.map((entry) => t(regionOrCuisine(entry))).join(", ")}`
        : null;
    case "selection_items":
      return Array.isArray(data.list)
        ? `${t("Building around")} ${data.list.length} ${t("ingredients you chose")}`
        : null;
    default:
      return null;
  }
}

// Region values arrive namespaced as "chinese:hunan"; the label table is keyed
// on the bare slug.
function regionOrCuisine(value: string): string {
  return value.includes(":") ? (value.split(":")[1] ?? value) : value;
}

interface Props {
  stages: StageEvent[];
  insights: InsightEvent[];
  finished?: boolean;
}

export function GenerationProgress({ stages, insights, finished = false }: Props) {
  const { t } = useLocale();

  const current = stages[stages.length - 1];
  const currentIndex = current
    ? GENERATION_STAGES.indexOf(current.stage)
    : -1;

  // A second attempt is worth naming: without it, a rejected first plan is
  // thirty unexplained extra seconds. With it, the user watches the allergen
  // check do the thing they are paying for.
  const retry = stages.find((entry) => entry.retryReason);

  return (
    <Card className="generation-card mk-rise" variant="dark">
      <div className="generation-card__head">
        <ChefStage finished={finished} stage={current?.stage ?? "analysing_profile"} />
        <div>
          <span className="generation-card__name">Mosaic Chef</span>
          <span className="generation-card__status">
            <span className={`generation-dot${finished ? "" : " generation-dot--live"}`} />
            {finished ? t("Agent done") : t("Working")}
          </span>
        </div>
      </div>

      <h2 className="generation-card__headline">
        {finished
          ? t("Your meal plan is ready!")
          : t(STAGE_LABELS[current?.stage ?? "analysing_profile"] ?? "")}
      </h2>

      {/* Stage-based, never a percentage. We know which step we are on; we do
          not know how far through the model call we are, and inventing a
          number for it would be the most ordinary kind of lie an AI product
          tells. */}
      <ol className="stage-list">
        {GENERATION_STAGES.map((stage, index) => {
          const state =
            finished || index < currentIndex
              ? "done"
              : index === currentIndex
                ? "active"
                : "todo";

          return (
            <li className={`stage-row stage-row--${state}`} key={stage}>
              <span className="stage-row__icon">
                {state === "done" ? (
                  <Check size={14} />
                ) : (
                  <span className={`stage-bullet${state === "active" ? " stage-bullet--live" : ""}`} />
                )}
              </span>
              <span className="small">
                {t(STAGE_LABELS[stage] ?? stage)}
                {stage === "building_meals" && retry ? (
                  <>
                    {" — "}
                    <span className="tiny">
                      {t("a dish contained")} {retry.retryReason}, {t("trying again")}
                    </span>
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      {insights.length > 0 ? (
        <div className="insight-chips mk-stagger">
          {insights.map((insight, index) => {
            const text = insightText(insight, t);
            if (!text) return null;
            return (
              <span className="insight-chip" key={`${insight.key}-${index}`}>
                {text}
              </span>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
