import { Card } from "./ui/Card";
import { useLocale } from "../context/LocaleContext";
import { CUISINE_LABELS, REGION_LABELS } from "../lib/profileOptions";
import { CUISINE_REGIONS, type Cuisine } from "../types";

interface Props {
  cuisines: Cuisine[];
  selected: string[];
  onChange: (regions: string[]) => void;
}

// Only renders for cuisines the household actually picked, and stays out of
// the way until then. Regions are optional everywhere: leaving a cuisine
// unnarrowed lets the planner rotate around its regions, which is the right
// default for someone who just wants "Chinese food".
export function CuisineRegionPicker({ cuisines, selected, onChange }: Props) {
  const { t } = useLocale();

  const withRegions = cuisines.filter(
    (cuisine) => (CUISINE_REGIONS[cuisine] ?? []).length > 0
  );

  if (withRegions.length === 0) return null;

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value]
    );
  }

  return (
    <>
      <div className="section-title">
        <h2>{t("Any regions in particular?")}</h2>
      </div>
      <p className="small muted">
        {t("Optional. Leave a cuisine blank and we will move around its regions week to week.")}
      </p>

      <Card className="section">
        <div className="form-grid">
          {withRegions.map((cuisine) => (
            <div key={cuisine}>
              <span className="eyebrow">{t(CUISINE_LABELS[cuisine])}</span>
              <div className="choice-grid" style={{ marginTop: 8 }}>
                {CUISINE_REGIONS[cuisine].map((region) => {
                  const value = `${cuisine}:${region}`;
                  return (
                    <button
                      className={`choice-pill${selected.includes(value) ? " is-selected" : ""}`}
                      key={value}
                      onClick={() => toggle(value)}
                      type="button"
                    >
                      {t(REGION_LABELS[region] ?? region)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
