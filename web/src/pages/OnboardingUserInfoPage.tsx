import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";

function ProgressHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="progress-header">
      <div className="progress-header__top">
        <button className="top-nav__back" onClick={onBack} type="button">
          Back
        </button>
        <span className="small muted">1 of 3</span>
      </div>
      <div className="progress-track">
        <span className="progress-segment is-complete" />
        <span className="progress-segment" />
        <span className="progress-segment" />
      </div>
    </div>
  );
}

export function OnboardingUserInfoPage() {
  const navigate = useNavigate();
  const ageRanges = ["18-24", "25-34", "35-44", "45-54", "55+"];
  const genders = ["Male", "Female", "Non-binary", "Prefer not to say"];
  const cultures = ["Chinese", "British", "Indian", "Pakistani", "Middle Eastern", "Japanese", "Korean", "Thai", "Italian", "Mexican", "African", "Other"];
  const dietary = ["Halal", "Kosher", "Vegetarian", "Vegan", "No Pork", "No Beef", "Gluten Free", "Dairy Free", "Nut Allergy", "None"];
  const [selectedAge, setSelectedAge] = useState("25-34");
  const [selectedGender, setSelectedGender] = useState("Prefer not to say");
  const [householdSize, setHouseholdSize] = useState(2);
  const [selectedCultures, setSelectedCultures] = useState(["Chinese", "British"]);
  const [selectedDietary, setSelectedDietary] = useState(["Halal"]);

  const toggleSelection = (value: string, selected: string[], setSelected: (value: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <main className="app-shell">
      <div className="page">
        <ProgressHeader onBack={() => navigate("/signup")} />

        <section className="auth-head">
          <MascotAvatar size="md" />
          <h1>Tell us about yourself</h1>
          <p>Help us personalize your meal plans.</p>
        </section>

        <section className="section">
          <Card>
            <p className="eyebrow">Age range</p>
            <div className="choice-grid">
              {ageRanges.map((item) => (
                <button
                  className={`choice-pill${selectedAge === item ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => setSelectedAge(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>

            <p className="eyebrow" style={{ marginTop: 22 }}>
              Gender
            </p>
            <div className="choice-grid">
              {genders.map((item) => (
                <button
                  className={`choice-pill${selectedGender === item ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => setSelectedGender(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="form-grid" style={{ marginTop: 22 }}>
              <Input label="Nationality" placeholder="Search nationality..." />
              <Input label="Occupation" placeholder="Search occupation..." />
            </div>

            <p className="eyebrow" style={{ marginTop: 22 }}>
              Household size
            </p>
            <div className="stepper">
              <button className="icon-only" onClick={() => setHouseholdSize((size) => Math.max(1, size - 1))} type="button">
                <Minus size={17} />
              </button>
              <span>
                <strong>{householdSize}</strong>
                <span className="tiny muted">{householdSize === 1 ? "person" : "people"}</span>
              </span>
              <button className="icon-only" onClick={() => setHouseholdSize((size) => size + 1)} type="button">
                <Plus size={17} />
              </button>
            </div>
          </Card>

          <Card>
            <h2>Your Food Culture</h2>
            <p className="small muted">Select the cultures that matter to you.</p>
            <div className="choice-grid" style={{ marginTop: 14 }}>
              {cultures.map((item) => (
                <button
                  className={`choice-pill${selectedCultures.includes(item) ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => toggleSelection(item, selectedCultures, setSelectedCultures)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2>Dietary Requirements</h2>
            <p className="small muted">Any restrictions or preferences?</p>
            <div className="choice-grid" style={{ marginTop: 14 }}>
              {dietary.map((item) => (
                <button
                  className={`choice-pill${selectedDietary.includes(item) ? " is-selected" : ""}`}
                  key={item}
                  onClick={() => toggleSelection(item, selectedDietary, setSelectedDietary)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </Card>
        </section>

        <Button fullWidth onClick={() => navigate("/onboarding/eating-habits")} style={{ marginTop: 22 }}>
          Continue
        </Button>
        <p className="tiny muted" style={{ textAlign: "center" }}>
          Your data is encrypted and never shared with third parties.
        </p>
      </div>
    </main>
  );
}
