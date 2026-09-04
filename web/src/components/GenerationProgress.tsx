import { Check, Loader2 } from "lucide-react";
import { Card } from "./ui/Card";
import { useLocale } from "../context/LocaleContext";
import { GENERATION_STAGES, type StageEvent } from "../lib/mealPlanStream";

// Wording lives here, not in the API. The server sends stage identifiers so
// these lines can be translated like every other string in the app.
const STAGE_LABELS: Record<string, string> = {
  profile: "Reading your preferences",
  pantry: "Checking what is already in your kitchen",
  generating: "Choosing dishes",
  checking: "Checking nothing conflicts with what you avoid",
  retrying: "Reworking the plan",
  saving: "Working out the shopping",
};

interface Props {
  stages: StageEvent[];
}

export function GenerationProgress({ stages }: Props) {
  const { t } = useLocale();

  // Ordered by the canonical sequence rather than by arrival, so a retry does
  // not shuffle finished rows around under the user's eyes.
  const seen = GENERATION_STAGES.map((stage) =>
    stages.find((entry) => entry.stage === stage)
  ).filter((entry): entry is StageEvent => entry !== undefined);

  const current = stages[stages.length - 1];

  return (
    <Card variant="dark">
      <div className="brand-row">
        <Loader2 size={18} />
        <strong>{t("Building your plan…")}</strong>
      </div>

      {seen.length === 0 ? (
        <p className="small" style={{ marginTop: 10 }}>
          {t("Checking your pantry, working around what you avoid, and staying in budget. This usually takes under a minute.")}
        </p>
      ) : (
        <ul className="check-list" style={{ marginTop: 14 }}>
          {seen.map((entry) => {
            const isCurrent = entry.stage === current?.stage;
            return (
              <li key={entry.stage} style={{ opacity: isCurrent ? 1 : 0.6 }}>
                {isCurrent ? <Loader2 size={16} /> : <Check size={16} />}
                <span className="small">
                  {t(STAGE_LABELS[entry.stage] ?? entry.stage)}
                  {/* The retry reason is the whole reason this exists. Without
                      it a rejected first attempt is thirty unexplained extra
                      seconds; with it the user watches the safety check work. */}
                  {entry.stage === "retrying" && entry.detail ? (
                    <>
                      {" — "}
                      {t("a dish contained")} {entry.detail}
                    </>
                  ) : null}
                  {entry.attempt > 1 && entry.stage !== "retrying" ? (
                    <> {t("(second attempt)")}</>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
