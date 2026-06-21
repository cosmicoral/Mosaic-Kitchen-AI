import { Check, ChevronRight, Globe2, Leaf, Recycle, Sparkles, Wallet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import mascotHero from "../assets/mascot-hero.png";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { landingFeatures } from "../data/mockData";

const featureIcons = {
  money: Wallet,
  health: Leaf,
  waste: Recycle,
};

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="app-shell app-shell--wide">
      <div className="page">
        <header className="landing-header">
          <Link className="brand-row" to="/">
            <span className="brand-mark">M</span>
            <span>Mosaic Kitchen</span>
          </Link>
          <div className="landing-actions">
            <div className="language-toggle" aria-label="Language selector">
              <span>EN</span>
              <span>中文</span>
            </div>
            <Button onClick={() => navigate("/login")} variant="secondary">
              Sign In
            </Button>
            <Button onClick={() => navigate("/signup")}>Sign Up</Button>
          </div>
        </header>

        <section className="hero-card">
          <img
            className="hero-card__image"
            src={mascotHero}
            alt="Mosaic Kitchen AI mascot holding food at a multicultural meal table"
          />
          <div className="hero-card__content">
            <h1>Smarter Meal Planning For Multicultural Households</h1>
            <p>Save money. Eat healthier. Reduce food waste. Without giving up the foods you love.</p>
            <Button
              fullWidth
              icon={<Sparkles size={18} />}
              onClick={() => navigate("/signup")}
            >
              Generate My First Meal Plan
            </Button>
            <p className="tiny" style={{ marginTop: 14 }}>
              Already have an account?{" "}
              <Link className="text-link" to="/login">
                Sign In
              </Link>
            </p>
          </div>
        </section>

        <section className="section feature-grid">
          {landingFeatures.map((feature) => {
            const Icon = featureIcons[feature.icon as keyof typeof featureIcons];
            return (
              <Card className="feature-card" key={feature.title}>
                <span className="feature-icon">
                  <Icon aria-hidden="true" size={20} />
                </span>
                <span>
                  <strong>{feature.title}</strong>
                  <br />
                  <span className="small muted">{feature.description}</span>
                </span>
              </Card>
            );
          })}
        </section>

        <section className="section">
          <Card variant="dark">
            <p className="eyebrow" style={{ color: "#bfea73" }}>
              Perfect for
            </p>
            <ul className="dark-list">
              {["International households", "Busy professionals", "Students", "Families", "Food lovers"].map(
                (item) => (
                  <li key={item}>
                    <Check size={17} />
                    <span>{item}</span>
                  </li>
                ),
              )}
            </ul>
          </Card>

          <Card variant="premium">
            <Badge variant="gold">Premium Plus</Badge>
            <h2>Unlock AI Kitchen Intelligence</h2>
            <ul className="check-list">
              {["AI fridge scanning", "Smart pantry recognition", "Unlimited meal plans"].map((item) => (
                <li key={item}>
                  <Check color="#79ad16" size={18} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button
              fullWidth
              icon={<ChevronRight size={18} />}
              onClick={() => navigate("/pricing")}
              style={{ marginTop: 18 }}
              variant="secondary"
            >
              Explore Premium
            </Button>
          </Card>
        </section>

        <footer className="section" style={{ justifyItems: "center", paddingBottom: 20 }}>
          <div className="small muted" style={{ display: "flex", gap: 16 }}>
            <span>About</span>
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
          <span className="tiny muted">2026 Mosaic Kitchen AI. Made with care in the UK</span>
        </footer>
      </div>
    </main>
  );
}
