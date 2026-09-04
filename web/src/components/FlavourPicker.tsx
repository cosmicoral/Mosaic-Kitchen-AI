import { Card } from "./ui/Card";
import { useLocale } from "../context/LocaleContext";
import {
  FLAVOUR_LABELS,
  SEASONING_HINTS,
  SEASONING_LABELS,
} from "../lib/profileOptions";
import {
  FLAVOUR_NOTES,
  SEASONING_INTENSITIES,
  type FlavourNote,
  type SeasoningIntensity,
} from "../types";

interface Props {
  intensity: SeasoningIntensity | null;
  notes: FlavourNote[];
  lowSalt: boolean;
  lowSugar: boolean;
  onChange: (patch: {
    seasoning_intensity?: SeasoningIntensity | null;
    flavour_notes?: FlavourNote[];
    low_salt?: boolean;
    low_sugar?: boolean;
  }) => void;
}

export function FlavourPicker({ intensity, notes, lowSalt, lowSugar, onChange }: Props) {
  const { t } = useLocale();

  function toggleNote(note: FlavourNote) {
    onChange({
      flavour_notes: notes.includes(note)
        ? notes.filter((entry) => entry !== note)
        : [...notes, note],
    });
  }

  return (
    <>
      <div className="section-title">
        <h2>{t("How do you like it seasoned?")}</h2>
      </div>

      <Card className="section">
        <span className="eyebrow">{t("Seasoning")}</span>
        <div className="form-grid" style={{ marginTop: 10 }}>
          {SEASONING_INTENSITIES.map((level) => (
            <button
              className={`choice-pill${intensity === level ? " is-selected" : ""}`}
              key={level}
              // Tapping the chosen one again clears it, so "no preference"
              // stays reachable without a fourth pill that means nothing.
              onClick={() =>
                onChange({ seasoning_intensity: intensity === level ? null : level })
              }
              style={{ textAlign: "left" }}
              type="button"
            >
              <strong>{t(SEASONING_LABELS[level])}</strong>
              <br />
              <span className="small muted">{t(SEASONING_HINTS[level])}</span>
            </button>
          ))}
        </div>

        <span className="eyebrow" style={{ display: "block", marginTop: 20 }}>
          {t("Tastes you want more of")}
        </span>
        <div className="choice-grid" style={{ marginTop: 10 }}>
          {FLAVOUR_NOTES.map((note) => (
            <button
              className={`choice-pill${notes.includes(note) ? " is-selected" : ""}`}
              key={note}
              onClick={() => toggleNote(note)}
              type="button"
            >
              {t(FLAVOUR_LABELS[note])}
            </button>
          ))}
        </div>

        {/* Separate from the taste pills above, because these two are usually
            blood pressure or blood sugar rather than preference. There is no
            "more salt" or "more sugar" counterpart: the ordinary amount is
            already the default, and a product should not offer turning it up
            as a setting. */}
        <span className="eyebrow" style={{ display: "block", marginTop: 20 }}>
          {t("Health needs")}
        </span>
        <div className="choice-grid" style={{ marginTop: 10 }}>
          <button
            className={`choice-pill${lowSalt ? " is-selected" : ""}`}
            onClick={() => onChange({ low_salt: !lowSalt })}
            type="button"
          >
            {t("Low salt 少盐")}
          </button>
          <button
            className={`choice-pill${lowSugar ? " is-selected" : ""}`}
            onClick={() => onChange({ low_sugar: !lowSugar })}
            type="button"
          >
            {t("Low sugar 少糖")}
          </button>
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>
          {t("We will keep added salt and sugar down and say where a low-salt version of a sauce is needed.")}
        </p>
      </Card>
    </>
  );
}
