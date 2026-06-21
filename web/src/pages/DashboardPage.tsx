import {
  Bell,
  Box,
  Camera,
  ChevronRight,
  Crown,
  ShoppingCart,
  Sparkles,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import mascotHero from "../assets/mascot-hero.png";
import { BottomNav } from "../components/navigation/BottomNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";
import { expiringSoon, iconMap, profile, recommendedMeals } from "../data/mockData";

export function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <header className="dashboard-header">
          <div className="brand-row">
            <MascotAvatar size="sm" />
            <span>
              Welcome Back, {profile.name}
              <br />
              <span className="small muted">Let us plan something delicious today.</span>
            </span>
          </div>
          <button className="icon-only" onClick={() => showToast("No new alerts")} type="button">
            <Bell size={18} />
          </button>
        </header>

        <section className="card dashboard-hero">
          <img src={mascotHero} alt="Mosaic Kitchen AI meal table" />
          <div className="dashboard-hero__overlay">
            <Badge variant="dark">{profile.plan}</Badge>
            <div className="premium-strip">
              <div>
                <span className="tiny">Current plan</span>
                <h2 style={{ margin: 0 }}>2 of 3 AI Plans Left</h2>
              </div>
              <Button onClick={() => navigate("/pricing")} variant="premium">
                Upgrade
              </Button>
            </div>
          </div>
        </section>

        <div className="section-title">
          <h2>What would you like to do today?</h2>
        </div>

        <button
          className="card action-card action-card--primary"
          onClick={() => navigate("/meal-plan")}
          style={{ padding: 16 }}
          type="button"
        >
          <span className="action-icon">
            <Utensils size={22} />
          </span>
          <span>
            <strong>Generate Meal Plan</strong>
            <br />
            <span className="small">Create a personalized weekly plan.</span>
          </span>
          <ChevronRight size={20} />
        </button>

        <section className="dashboard-grid" style={{ marginTop: 12 }}>
          <button className="card action-card" onClick={() => navigate("/pantry")} style={{ padding: 16 }} type="button">
            <span>
              <span className="feature-icon">
                <Box size={20} />
              </span>
              <br />
              <strong>Pantry</strong>
              <br />
              <span className="small muted">12 ingredients</span>
            </span>
          </button>
          <button
            className="card action-card"
            onClick={() => navigate("/shopping-list")}
            style={{ padding: 16 }}
            type="button"
          >
            <span>
              <span className="feature-icon">
                <ShoppingCart size={20} />
              </span>
              <br />
              <strong>Shopping List</strong>
              <br />
              <span className="small muted">5 items to buy</span>
            </span>
          </button>
        </section>

        <button
          className="card action-card"
          onClick={() => navigate("/ai-vision")}
          style={{ marginTop: 12, padding: 16 }}
          type="button"
        >
          <span className="action-icon" style={{ background: "var(--color-gold-soft)" }}>
            <Camera color="#b26a00" size={21} />
          </span>
          <span>
            <strong>AI Vision Scan</strong>{" "}
            <Badge variant="gold">Premium</Badge>
            <br />
            <span className="small muted">Scan your fridge instantly.</span>
          </span>
          <ChevronRight color="var(--color-gold)" size={19} />
        </button>

        <Card className="section" variant="dark">
          <div className="premium-strip">
            <span>
              <strong>Unlock Unlimited Meal Plans</strong>
              <br />
              <span className="small">Premium from £3.99/month</span>
            </span>
            <Button onClick={() => navigate("/pricing")} variant="premium">
              Upgrade
            </Button>
          </div>
        </Card>

        <Card className="section">
          <div className="premium-strip">
            <h2 style={{ margin: 0 }}>Kitchen Insights</h2>
            <MascotAvatar size="sm" />
          </div>
          <div className="stats-grid" style={{ marginTop: 14 }}>
            <div className="stat-card" style={{ background: "#fff4de", borderRadius: 14 }}>
              <strong>3 items</strong>
              <span className="tiny muted">Expiring soon</span>
            </div>
            <div className="stat-card" style={{ background: "#f4fae8", borderRadius: 14 }}>
              <strong>£7.80</strong>
              <span className="tiny muted">Potential savings</span>
            </div>
            <div className="stat-card" style={{ background: "#edf4ed", borderRadius: 14 }}>
              <strong>1.3kg</strong>
              <span className="tiny muted">Waste avoided</span>
            </div>
            <div className="stat-card" style={{ background: "#eef3ff", borderRadius: 14 }}>
              <strong>87%</strong>
              <span className="tiny muted">Health score</span>
            </div>
          </div>
        </Card>

        <Card className="section">
          <h2 style={{ marginTop: 0 }}>Recommended For You</h2>
          <div className="form-grid">
            {recommendedMeals.map((meal) => (
              <div className="meal-row" key={meal.name}>
                <span className="meal-icon">{iconMap[meal.icon]}</span>
                <span>
                  <strong>{meal.name}</strong>
                  <br />
                  <span className="small muted">{meal.meta}</span>
                </span>
                <ChevronRight color="var(--color-primary-strong)" size={18} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="section" variant="alert">
          <div className="premium-strip">
            <h2 style={{ margin: 0 }}>Use These Soon</h2>
            <button className="top-nav__right" onClick={() => navigate("/pantry")} type="button">
              View Pantry
            </button>
          </div>
          <div className="expiry-list" style={{ marginTop: 12 }}>
            {expiringSoon.map((item) => (
              <div className="expiry-row" key={item.name}>
                <span className="item-icon">{iconMap[item.icon]}</span>
                <strong>{item.name}</strong>
                <Badge variant={item.tone === "red" ? "red" : "gold"}>{item.timeLeft}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <BottomNav />
    </main>
  );
}
