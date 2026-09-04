import {
  Bell,
  Box,
  Camera,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { genericAvatar, landingHero } from "../assets/mascots";
import { BottomNav } from "../components/navigation/BottomNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../hooks/useDashboard";
import { expiryTone, formatExpiryForLocale } from "../lib/pantryFormat";
import { totalMeals } from "../lib/mealPlanFormat";
import { PLAN_COPY, TIER_LABELS } from "../lib/plans";
import { CUISINE_LABELS } from "../lib/profileOptions";
import type { Cuisine } from "../types";
import { useLocale } from "../context/LocaleContext";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const { data, status, error, refresh } = useDashboard();
  const displayName = user?.email.split("@")[0] || "there";
  const recommendedMeals = data?.latestPlan?.plan.days
    .flatMap((day) => day.meals)
    .slice(0, 3) ?? [];
  const itemsToBuy = data?.shoppingItems.filter((item) => !item.is_checked).length ?? 0;

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <header className="dashboard-header">
          <div className="brand-row">
            <MascotAvatar size="sm" src={genericAvatar} />
            <span>
              {t("Welcome Back")}, {displayName}
              <br />
              <span className="small muted">{t("Let us plan something delicious today.")}</span>
            </span>
          </div>
          <button className="icon-only" onClick={() => navigate("/expiry-alert")} type="button">
            <Bell size={18} />
          </button>
        </header>

        <section className="card dashboard-hero">
          <img src={landingHero} alt="Mosaic Kitchen AI meal table" />
          <div className="dashboard-hero__overlay">
            {/* Read from the quota rather than hardcoded: this badge said
                "Free Account" to a paying Plus subscriber, directly beside a
                Plus-sized allowance. */}
            <Badge variant="dark">
              {data ? t(TIER_LABELS[data.quota.tier]) : t("Loading…")}
            </Badge>
            <div className="premium-strip">
              <div>
                <span className="tiny">{t("Current plan")}</span>
                <h2 style={{ margin: 0 }}>
                  {data
                    ? (localeText(t, data.quota.remaining, data.quota.limit))
                    : t("Loading…")}
                </h2>
              </div>
              {/* A paying customer is sent to their own plan, not back to the
                  shop. Only Pro has nothing left to upgrade to. */}
              <Button
                onClick={() => navigate(data?.quota.tier === "free" ? "/pricing" : "/subscription")}
                variant="premium"
              >
                {data && data.quota.tier !== "free" ? t("Your plan") : t("Upgrade")}
              </Button>
            </div>
          </div>
        </section>

        {status === "loading" ? (
          <Card className="section">
            <div className="brand-row"><Loader2 size={18} /><span className="small muted">{t("Loading your kitchen…")}</span></div>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card className="section">
            <strong>{t("Could not load your dashboard")}</strong>
            <p className="small muted">{error}</p>
            <Button icon={<RefreshCw size={16} />} onClick={() => void refresh()} variant="secondary">{t("Try again")}</Button>
          </Card>
        ) : null}

        <div className="section-title">
          <h2>{t("What would you like to do today?")}</h2>
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
            <strong>{t("Generate Meal Plan")}</strong>
            <br />
            <span className="small">{t("Create a personalized weekly plan.")}</span>
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
              <strong>{t("Pantry")}</strong>
              <br />
              <span className="small muted">{data?.pantryItems.length ?? 0} {t("ingredients")}</span>
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
              <strong>{t("Shopping List")}</strong>
              <br />
              <span className="small muted">{itemsToBuy} {t("items to buy")}</span>
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
            <strong>{t("AI Vision Scan")}</strong>{" "}
            {/* Not "Premium": the feature does not exist on any tier yet, and
                a gold badge reads as "pay to unlock this" rather than "not
                built". */}
            <Badge variant="cream">{t("Coming soon")}</Badge>
            <br />
            <span className="small muted">{t("Scan a shelf or a receipt into your pantry.")}</span>
          </span>
          <ChevronRight color="var(--color-gold)" size={19} />
        </button>

        {/* Hidden once they are paying. Showing someone an advert for the
            thing they already bought reads as the app not knowing who they
            are, and it is the fastest way to make a subscription feel like it
            did nothing. */}
        {data?.quota.tier === "free" ? (
          <Card className="section" variant="dark">
            <div className="premium-strip">
              <span>
                <strong>{t("Cook for the whole household")}</strong>
                <br />
                {/* Sourced from PLAN_COPY rather than typed in, so the day this
                    price changes in Stripe there is one place to change it here
                    too. The hardcoded £3.99 that used to sit here was left over
                    from the mock pricing and undercut the real plans by half. */}
                <span className="small">
                  {t("Plus from")} {PLAN_COPY[1]?.price.month} {t("a month")}
                </span>
              </span>
              <Button onClick={() => navigate("/pricing")} variant="premium">
                {t("Upgrade")}
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="section">
          <div className="premium-strip">
            <h2 style={{ margin: 0 }}>{t("Kitchen Insights")}</h2>
            <MascotAvatar size="sm" src={genericAvatar} />
          </div>
          {/* Every figure here answers a question the user then wants to act
              on, so each one is the button to the page that acts on it.
              A number you cannot follow is a dead end. */}
          <div className="stats-grid" style={{ marginTop: 14 }}>
            {[
              {
                key: "expiring",
                value: `${data?.expiringItems.length ?? 0}`,
                label: t("Expiring soon"),
                background: "#fff4de",
                to: "/expiry-alert",
              },
              {
                key: "pantry",
                value: `${data?.pantryItems.length ?? 0}`,
                label: t("Pantry items"),
                background: "#f4fae8",
                to: "/pantry",
              },
              {
                key: "buy",
                value: `${itemsToBuy}`,
                label: t("Still to buy"),
                background: "#edf4ed",
                to: "/shopping-list",
              },
              {
                key: "meals",
                value: `${data?.latestPlan ? totalMeals(data.latestPlan.plan) : 0}`,
                label: t("Meals planned"),
                background: "#eef3ff",
                to: "/meal-plan",
              },
            ].map((stat) => (
              <button
                className="stat-card"
                key={stat.key}
                onClick={() => navigate(stat.to)}
                style={{
                  background: stat.background,
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "center",
                }}
                type="button"
              >
                <strong>{stat.value}</strong>
                <span className="tiny muted">{stat.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="section">
          <h2 style={{ marginTop: 0 }}>{t("Recommended For You")}</h2>
          <div className="form-grid">
            {/* Was a div with a chevron on it — an arrow that looks like a
                link and does nothing is worse than no arrow. */}
            {recommendedMeals.map((meal) => (
              <button
                className="meal-row"
                key={meal.name}
                onClick={() => navigate("/meal-plan")}
                style={{ border: "none", background: "none", cursor: "pointer", textAlign: "left", width: "100%" }}
                type="button"
              >
                <span className="meal-icon">{meal.region?.slice(0, 2) ?? meal.name.slice(0, 2)}</span>
                <span>
                  <strong>{meal.name}</strong>
                  <br />
                  <span className="small muted">
                    {meal.minutes} {t("minutes")} · {t(CUISINE_LABELS[meal.cuisine as Cuisine] ?? meal.cuisine)}
                  </span>
                </span>
                <ChevronRight color="var(--color-primary-strong)" size={18} />
              </button>
            ))}
            {status === "ready" && recommendedMeals.length === 0 ? (
              <p className="small muted">{t("Generate a meal plan to see recommendations here.")}</p>
            ) : null}
          </div>
        </Card>

        <Card className="section" variant="alert">
          <div className="premium-strip">
            <h2 style={{ margin: 0 }}>{t("Use These Soon")}</h2>
            <button className="top-nav__right" onClick={() => navigate("/pantry")} type="button">
              {t("View Pantry")}
            </button>
          </div>
          <div className="expiry-list" style={{ marginTop: 12 }}>
            {(data?.expiringItems ?? []).slice(0, 3).map((item) => (
              <div className="expiry-row" key={item.id}>
                <span className="item-icon">{item.name.slice(0, 2)}</span>
                <strong>{item.name}</strong>
                <Badge variant={expiryTone(item.expires_on)}>{formatExpiryForLocale(item.expires_on, locale)}</Badge>
              </div>
            ))}
            {status === "ready" && data?.expiringItems.length === 0 ? (
              <p className="small muted">{t("Nothing expires in the next 7 days.")}</p>
            ) : null}
          </div>
        </Card>
      </div>
      <BottomNav />
    </main>
  );
}

function localeText(t: (text: string) => string, remaining: number, limit: number) {
  return `${remaining} / ${limit} ${t("AI Plans Left")}`;
}
