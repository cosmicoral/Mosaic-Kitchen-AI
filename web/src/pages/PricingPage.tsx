import { Check, Clock, Crown, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pricingMascot } from "../assets/mascots";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { ApiError } from "../lib/api";
import { fetchPlans, startCheckout } from "../lib/billing";
import { ANNUAL_SAVING_LABEL, PLAN_COPY, type Interval } from "../lib/plans";
import type { PlanRef, Tier } from "../types";

export function PricingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLocale();
  const { user } = useAuth();

  const [interval, setInterval] = useState<Interval>("month");
  const [plans, setPlans] = useState<PlanRef[]>([]);
  const [pending, setPending] = useState<Tier | null>(null);

  // Only the price ids are fetched. The copy and the amounts render straight
  // away, so a slow API shows a working page rather than an empty one.
  useEffect(() => {
    fetchPlans()
      .then((data) => setPlans(data.plans))
      .catch(() => setPlans([]));
  }, []);

  function priceIdFor(tier: Tier): string | null {
    if (tier === "free") return null;
    return plans.find((plan) => plan.tier === tier && plan.interval === interval)?.price_id ?? null;
  }

  async function handleChoose(tier: Tier) {
    if (tier === "free") {
      navigate(user ? "/dashboard" : "/signup");
      return;
    }

    // Checkout needs a user to attach the subscription to, so an anonymous
    // visitor signs up first and is brought straight back here.
    if (!user) {
      navigate("/signup", { state: { from: "/pricing" } });
      return;
    }

    const priceId = priceIdFor(tier);
    if (!priceId) {
      showToast(t("That plan is not available right now"));
      return;
    }

    setPending(tier);
    try {
      const url = await startCheckout(priceId);
      // A full-page assignment, not react-router: Stripe Checkout is a
      // different origin and cannot be rendered inside the app.
      window.location.href = url;
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "ALREADY_SUBSCRIBED") {
        showToast(t("You already have a subscription"));
        navigate("/subscription");
        return;
      }
      showToast(caught instanceof Error ? caught.message : t("Could not start checkout"));
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="app-shell app-shell--wide public-shell">
      <div className="page">
        <TopNav fallbackBackTo="/dashboard" title={t("Pricing")} />

        <section className="pricing-hero">
          <div className="page-heading">
            <p className="eyebrow">{t("Choose your plan")}</p>
            <h1>{t("Cook your own food, without the planning")}</h1>
            <p>{t("Cancel any time. Prices include VAT where it applies.")}</p>
          </div>
          <img
            className="pricing-hero__image"
            src={pricingMascot}
            alt="Mosaic Kitchen mascot presenting premium features"
          />
        </section>

        <div className="choice-grid" style={{ justifyContent: "center", marginBottom: 20 }}>
          <button
            className={`choice-pill${interval === "month" ? " is-selected" : ""}`}
            onClick={() => setInterval("month")}
            type="button"
          >
            {t("Monthly")}
          </button>
          <button
            className={`choice-pill${interval === "year" ? " is-selected" : ""}`}
            onClick={() => setInterval("year")}
            type="button"
          >
            {t("Yearly")} · {t(ANNUAL_SAVING_LABEL)}
          </button>
        </div>

        <section className="section pricing-grid">
          {PLAN_COPY.map((plan) => {
            const isPro = plan.tier === "pro";
            const isPlus = plan.tier === "plus";
            const isBusy = pending === plan.tier;

            return (
              <Card
                className={`pricing-card${isPlus ? " is-featured" : ""}`}
                key={plan.tier}
                variant={isPro ? "premium" : isPlus ? "dark" : "surface"}
              >
                <div className="premium-strip">
                  <div>
                    <Badge variant={isPro ? "gold" : isPlus ? "dark" : "cream"}>
                      {/* Plus is marked as the recommendation, not Pro. Pro
                          exists mostly to make Plus read as the sensible
                          middle choice. */}
                      {t(isPro ? "Everything" : isPlus ? "Most popular" : "Starter")}
                    </Badge>
                    <h2>{t(plan.name)}</h2>
                  </div>
                  {isPro ? <Crown size={28} /> : <Sparkles size={26} />}
                </div>

                <p className={isPlus ? "small" : "small muted"}>{t(plan.tagline)}</p>

                <div className="price">
                  <strong>{plan.price[interval]}</strong>
                  <span className={isPlus ? "small" : "small muted"}>
                    {t(plan.cadence[interval])}
                  </span>
                </div>

                <ul className="check-list">
                  {plan.features.map((feature) => (
                    <li key={feature.text} style={{ opacity: feature.soon ? 0.65 : 1 }}>
                      {feature.soon ? <Clock size={17} /> : <Check size={17} />}
                      <span>
                        {t(feature.text)}
                        {feature.soon ? (
                          <>
                            {" "}
                            <Badge variant="cream">{t("Coming soon")}</Badge>
                          </>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  disabled={isBusy}
                  fullWidth
                  icon={isBusy ? <Loader2 size={16} /> : undefined}
                  onClick={() => void handleChoose(plan.tier)}
                  style={{ marginTop: 18 }}
                  variant={isPro ? "premium" : isPlus ? "secondary" : "primary"}
                >
                  {isBusy ? t("Opening checkout…") : t(plan.cta)}
                </Button>
              </Card>
            );
          })}
        </section>

        <p className="small muted" style={{ textAlign: "center", marginTop: 8 }}>
          {t("Pantry, shopping lists and expiry alerts are unlimited on every plan, including Free.")}
        </p>
        <p className="tiny muted" style={{ textAlign: "center" }}>
          {t("Lines marked Coming soon are not available yet. Cancel any time.")}
        </p>
      </div>
    </main>
  );
}
