import { Bookmark, Check, Snowflake, Trash2, Utensils } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { expiryMascot } from "../assets/mascots";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useToast } from "../components/ui/Toast";
import { iconMap } from "../data/mockData";

export function ExpiryAlertPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedAction, setSelectedAction] = useState("Use While Fresh");

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav
          backTo="/pantry"
          onRightAction={() => showToast("Expiry alert shared")}
          rightLabel="Share"
          title="Expiry Alert"
        />

        <section className="page-heading">
          <img
            className="page-mascot"
            src={expiryMascot}
            alt="Worried Mosaic Kitchen mascot holding expiring spinach"
          />
          <h1>Food Expiry Alert</h1>
          <p>Prevent food waste before it happens.</p>
        </section>

        <section className="section">
          <Card variant="alert">
            <h2 style={{ color: "#b42318", marginTop: 0 }}>Spinach expires in 2 days</h2>
            <div className="list-row">
              <span className="item-icon">{iconMap.spinach}</span>
              <span className="small muted">Quantity</span>
              <strong>200g</strong>
            </div>
            <div className="list-row">
              <span />
              <span className="small muted">Estimated value</span>
              <strong>£1.80</strong>
            </div>
            <div className="list-row">
              <span />
              <span className="small muted">Waste impact</span>
              <strong style={{ color: "var(--color-orange)" }}>Medium</strong>
            </div>
          </Card>

          <h2>What would you like to do?</h2>
          {[
            { title: "Use While Fresh", text: "Generate recipes using spinach today.", icon: Utensils },
            { title: "Freeze and Preserve", text: "Suggest freezing and preservation options.", icon: Snowflake },
            { title: "Discard", text: "Log food waste and estimate cost.", icon: Trash2 },
          ].map((choice, index) => {
            const Icon = choice.icon;
            const isSelected = selectedAction === choice.title;
            return (
              <Card
                className="alert-choice"
                key={choice.title}
                onClick={() => setSelectedAction(choice.title)}
                role="button"
                tabIndex={0}
              >
                <span className="feature-icon">
                  <Icon size={20} />
                </span>
                <span>
                  <strong>{choice.title}</strong>
                  <br />
                  <span className="small muted">{choice.text}</span>
                </span>
                <span className={`check-circle${isSelected ? " is-on" : ""}`}>
                  {isSelected ? <Check size={14} /> : null}
                </span>
              </Card>
            );
          })}

          <h2>AI Recommendations</h2>
          {["Vegetable Fried Rice", "Japanese Spinach Noodle Soup", "Spinach Omelette"].map((recipe, index) => (
            <Card key={recipe}>
              <div className="premium-strip">
                <span className="brand-row">
                  <span className="item-icon">{index === 0 ? "Fr" : index === 1 ? "No" : "Om"}</span>
                  <span>
                    <strong>{recipe}</strong>
                    <br />
                    <span className="small muted">15-20 min - saves £{index === 0 ? "3.20" : index === 1 ? "2.80" : "1.50"}</span>
                  </span>
                </span>
                <Bookmark size={18} />
              </div>
              <Button
                fullWidth
                onClick={() => navigate("/meal-plan")}
                style={{ marginTop: 12 }}
                variant="secondary"
              >
                Cook This Recipe
              </Button>
            </Card>
          ))}

          <Card>
            <h2>Food Waste Insights</h2>
            <div className="metric-grid">
              <div className="stat-card">
                <strong>18</strong>
                <span className="tiny muted">Items saved</span>
              </div>
              <div className="stat-card">
                <strong>£23</strong>
                <span className="tiny muted">Money saved</span>
              </div>
              <div className="stat-card">
                <strong>12kg</strong>
                <span className="tiny muted">CO2 reduced</span>
              </div>
            </div>
          </Card>

          <Button fullWidth icon={<Utensils size={18} />} onClick={() => showToast("Fresh recipe ideas generated")}>
            Generate Fresh Recipes
          </Button>
          <Button fullWidth onClick={() => showToast("Reminder set for tomorrow")} variant="ghost">
            Remind Me Tomorrow
          </Button>
        </section>
      </div>
    </main>
  );
}
