import { Check, Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { pricingMascot } from "../assets/mascots";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useToast } from "../components/ui/Toast";
import { pricingPlans } from "../data/mockData";
import { useLocale } from "../context/LocaleContext";

export function PricingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLocale();

  const handlePlanClick = (planName: string) => {
    if (planName === "Free") {
      navigate("/dashboard");
      return;
    }

    showToast("This is a mock payment flow");
    navigate("/payment-placeholder");
  };

  return (
    <main className="app-shell app-shell--wide public-shell">
      <div className="page">
        <TopNav fallbackBackTo="/dashboard" title="Pricing" />

        <section className="pricing-hero">
          <div className="page-heading">
            <p className="eyebrow">{t("Choose your plan")}</p>
            <h1>{t("Unlock smarter food routines")}</h1>
            <p>{t("Static pricing cards for now. Payments are not connected in this phase.")}</p>
          </div>
          <img
            className="pricing-hero__image"
            src={pricingMascot}
            alt="Mosaic Kitchen mascot presenting premium features"
          />
        </section>

        <section className="section pricing-grid">
          {pricingPlans.map((plan) => (
            <Card
              className={`pricing-card${plan.featured || plan.plus ? " is-featured" : ""}`}
              key={plan.name}
              variant={plan.plus ? "premium" : plan.featured ? "dark" : "surface"}
            >
              <div className="premium-strip">
                <div>
                  <Badge variant={plan.plus ? "gold" : plan.featured ? "dark" : "cream"}>
                    {t(plan.plus ? "Premium Plus" : plan.featured ? "Best Value" : "Starter")}
                  </Badge>
                  <h2>{t(plan.name)}</h2>
                </div>
                {plan.plus ? <Crown size={28} /> : <Sparkles size={26} />}
              </div>
              <p className={plan.featured ? "small" : "small muted"}>{t(plan.description)}</p>
              <div className="price">
                <strong>{plan.price}</strong>
                <span className={plan.featured ? "small" : "small muted"}>{t(plan.cadence)}</span>
              </div>
              <ul className="check-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={17} />
                    <span>{t(feature)}</span>
                  </li>
                ))}
              </ul>
              <Button
                fullWidth
                onClick={() => handlePlanClick(plan.name)}
                style={{ marginTop: 18 }}
                variant={plan.plus ? "premium" : plan.featured ? "secondary" : "primary"}
              >
                {t(plan.cta)}
              </Button>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
