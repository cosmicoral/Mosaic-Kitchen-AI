import { Card } from "./ui/Card";
import { useLocale } from "../context/LocaleContext";
import {
  EXTRAS_FREQUENCY_HINTS,
  EXTRAS_FREQUENCY_LABELS,
  EXTRA_KIND_HINTS,
  EXTRA_KIND_LABELS,
} from "../lib/profileOptions";
import {
  EXTRAS_FREQUENCIES,
  EXTRA_KINDS,
  type ExtraKind,
  type ExtrasFrequency,
} from "../types";

interface Props {
  kinds: ExtraKind[];
  frequency: ExtrasFrequency;
  lowSugar: boolean;
  onChange: (patch: {
    include_extras?: ExtraKind[];
    extras_frequency?: ExtrasFrequency;
  }) => void;
}

export function ExtrasPicker({ kinds, frequency, lowSugar, onChange }: Props) {
  const { t } = useLocale();

  function toggle(kind: ExtraKind) {
    onChange({
      include_extras: kinds.includes(kind)
        ? kinds.filter((entry) => entry !== kind)
        : [...kinds, kind],
    });
  }

  return (
    <>
      <div className="section-title">
        <h2>{t("Fruit, snacks and dessert")}</h2>
      </div>
      <p className="small muted">
        {t("Off by default. Whatever you pick gets its ingredients added to the shopping list.")}
      </p>

      <Card className="section">
        <div className="form-grid">
          {EXTRA_KINDS.map((kind) => (
            <button
              className={`choice-pill${kinds.includes(kind) ? " is-selected" : ""}`}
              key={kind}
              onClick={() => toggle(kind)}
              style={{ textAlign: "left" }}
              type="button"
            >
              <strong>{t(EXTRA_KIND_LABELS[kind])}</strong>
              <br />
              <span className="small muted">{t(EXTRA_KIND_HINTS[kind])}</span>
            </button>
          ))}
        </div>

        {/* The frequency control only appears once something is switched on.
            Asking "how often?" about nothing is a question with no answer. */}
        {kinds.length > 0 ? (
          <>
            <span className="eyebrow" style={{ display: "block", marginTop: 20 }}>
              {t("How often")}
            </span>
            <div className="form-grid" style={{ marginTop: 10 }}>
              {EXTRAS_FREQUENCIES.map((level) => (
                <button
                  className={`choice-pill${frequency === level ? " is-selected" : ""}`}
                  key={level}
                  onClick={() => onChange({ extras_frequency: level })}
                  style={{ textAlign: "left" }}
                  type="button"
                >
                  <strong>{t(EXTRAS_FREQUENCY_LABELS[level])}</strong>
                  <br />
                  <span className="small muted">{t(EXTRAS_FREQUENCY_HINTS[level])}</span>
                </button>
              ))}
            </div>

            {/* Surfaced rather than applied silently. The two settings can look
                contradictory — plenty of extras, but low sugar — and a user who
                cannot see how they interact assumes one of them was ignored. */}
            {lowSugar && kinds.includes("dessert") ? (
              <p className="small muted" style={{ marginTop: 14 }}>
                {t("You have low sugar on, so dessert appears at most twice a week whatever you choose here. Fruit fills the other days.")}
              </p>
            ) : null}
          </>
        ) : null}
      </Card>
    </>
  );
}
