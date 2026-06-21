import { Check, Edit, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";
import { detectedIngredients, iconMap } from "../data/mockData";

export function DetectionResultsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState(
    detectedIngredients.map((ingredient) => ingredient.name),
  );

  const selectedCount = selectedIngredients.length;

  const toggleIngredient = (name: string) => {
    setSelectedIngredients((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const addToPantry = () => {
    showToast(`${selectedCount} ingredients added to pantry`);
    navigate("/pantry");
  };

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav
          backTo="/ai-vision"
          onRightAction={() => setIsEditing((editing) => !editing)}
          rightLabel={isEditing ? "Done" : "Edit"}
          title="Detection Results"
        />

        <section className="page-heading">
          <h1>Detected Ingredients</h1>
          <p>{detectedIngredients.length} ingredients identified successfully.</p>
        </section>

        <section className="section">
          <Card variant="dark">
            <div style={{ display: "grid", justifyItems: "center", textAlign: "center" }}>
              <MascotAvatar size="lg" />
              <Badge variant="cream" style={{ marginTop: 12 }}>
                AI Vision Complete
              </Badge>
              <h2>{detectedIngredients.length} Ingredients Detected</h2>
              <p className="small">Review before adding to pantry.</p>
              <div className="metric-grid" style={{ width: "100%", marginTop: 12 }}>
                <div>
                  <strong>91%</strong>
                  <br />
                  <span className="tiny">Avg confidence</span>
                </div>
                <div>
                  <strong>3 items</strong>
                  <br />
                  <span className="tiny">Expiring soon</span>
                </div>
                <div>
                  <strong>£17.50</strong>
                  <br />
                  <span className="tiny">Est. value</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="premium-strip">
            <h2 style={{ margin: 0 }}>Detected Ingredients</h2>
            <strong style={{ color: "var(--color-primary-strong)" }}>{selectedCount} selected</strong>
          </div>

          {isEditing ? <div className="edit-banner">Edit detection mode is on. Tap ingredients to include or remove them.</div> : null}

          <Card className="detection-list">
            {detectedIngredients.map((item) => {
              const isSelected = selectedIngredients.includes(item.name);
              return (
              <button className="check-item" key={item.name} onClick={() => toggleIngredient(item.name)} type="button">
                <span className={`check-circle${isSelected ? " is-on" : ""}`}>
                  {isSelected ? <Check size={14} /> : null}
                </span>
                <span className="brand-row">
                  <span className="item-icon">{iconMap[item.icon]}</span>
                  <span>
                    <strong>{item.name}</strong>
                    <br />
                    <span className="small muted">{item.amount}</span>
                  </span>
                </span>
                <Badge variant={item.confidence > 92 ? "green" : "gold"}>{item.confidence}%</Badge>
              </button>
              );
            })}
          </Card>

          <Card className="suggestion-card">
            <div className="brand-row">
              <MascotAvatar size="sm" />
              <span>
                <strong>AI Expiry Prediction</strong> <Badge variant="green">Smart</Badge>
                <br />
                <span className="small muted">Suggested expiry dates.</span>
              </span>
            </div>
            <div className="summary-list">
              {[
                ["Spinach", "2 days", "red"],
                ["Chicken Breast", "2 days", "red"],
                ["Milk", "4 days", "gold"],
                ["Eggs", "9 days", "gold"],
              ].map(([name, days, tone]) => (
                <div className="summary-row" key={name}>
                  <strong>{name}</strong>
                  <Badge variant={tone === "red" ? "red" : "gold"}>{days}</Badge>
                </div>
              ))}
            </div>
            <Card variant="soft">
              <span className="small">
                Use spinach and chicken within the next 2 days to avoid waste.
              </span>
            </Card>
          </Card>

          <Card className="suggestion-card">
            <div className="brand-row">
              <MascotAvatar size="sm" />
              <span>
                <strong>Mosaic AI Suggestion</strong> <Badge variant="green">Tip</Badge>
                <br />
                <span className="small muted">Use spinach first - expires in 2 days.</span>
              </span>
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              {["Chicken Stir Fry", "Spinach Omelette", "Tomato Rice Bowl"].map((recipe) => (
                <Card className="premium-strip" key={recipe} variant="soft">
                  <strong>{recipe}</strong>
                  <Plus size={16} />
                </Card>
              ))}
            </div>
            <Card variant="soft">
              <p className="eyebrow">Potential waste reduction</p>
              <h2 style={{ color: "var(--color-forest)", margin: 0 }}>£6.80</h2>
            </Card>
          </Card>

          <Card>
            <div className="premium-strip">
              <span>
                <p className="eyebrow">Ready to add</p>
                <h2 style={{ margin: 0 }}>{selectedCount} ingredients</h2>
                <p className="small muted">
                  Estimated pantry value <strong style={{ color: "var(--color-primary-deep)" }}>£17.50</strong>
                </p>
              </span>
              <div className="food-icon-strip" style={{ maxWidth: 94 }}>
                {detectedIngredients.slice(0, 6).map((item) => (
                  <span key={item.name}>{iconMap[item.icon]}</span>
                ))}
              </div>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "#e4ebdc", marginTop: 16 }}>
              <div
                style={{
                  width: `${(selectedCount / detectedIngredients.length) * 100}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "var(--color-primary)",
                }}
              />
            </div>
            <p className="tiny muted">
              {selectedCount} of {detectedIngredients.length} ingredients selected
            </p>
          </Card>
        </section>

        <div className="footer-actions">
          <Button icon={<Edit size={17} />} onClick={() => setIsEditing((editing) => !editing)} variant="secondary">
            {isEditing ? "Done Editing" : "Edit Detection"}
          </Button>
          <Button
            icon={<ShieldCheck size={17} />}
            onClick={addToPantry}
          >
            Add to Pantry ({selectedCount})
          </Button>
        </div>
      </div>
    </main>
  );
}
