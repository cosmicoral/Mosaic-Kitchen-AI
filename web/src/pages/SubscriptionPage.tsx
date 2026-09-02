import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BottomNav } from "../components/navigation/BottomNav";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useToast } from "../components/ui/Toast";
import { useLocale } from "../context/LocaleContext";
import { useBilling } from "../hooks/useBilling";
import { openBillingPortal } from "../lib/billing";
import { PLAN_COPY, TIER_LABELS } from "../lib/plans";

// Stripe's vocabulary, translated at the edge rather than stored translated.
const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment failed — retrying",
  canceled: "Cancelled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
};

export function SubscriptionPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const { billing, status, error, refresh, waitForUpgrade } = useBilling();

  const [openingPortal, setOpeningPortal] = useState(false);
  const justPaid = searchParams.get("checkout") === "success";
  const [confirming, setConfirming] = useState(justPaid);

  // Arriving from Checkout means the card went through, not that we have heard
  // about it yet — the webhook is a separate request. Poll rather than trust
  // the redirect, which anyone could visit directly.
  useEffect(() => {
    if (!justPaid) return;
    let cancelled = false;

    void waitForUpgrade().then(() => {
      if (!cancelled) setConfirming(false);
    });

    return () => {
      cancelled = true;
    };
  }, [justPaid, waitForUpgrade]);

  async function handlePortal() {
    setOpeningPortal(true);
    try {
      window.location.href = await openBillingPortal();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : t("Could not open billing"));
      setOpeningPortal(false);
    }
  }

  const tier = billing?.tier ?? "free";
  const copy = PLAN_COPY.find((plan) => plan.tier === tier);

  const renewsOn = billing?.current_period_end
    ? new Date(billing.current_period_end).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        // The value is a UTC instant; formatting it in the viewer's zone can
        // move it a day either side of midnight.
        timeZone: "UTC",
      })
    : null;

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <TopNav fallbackBackTo="/profile" title={t("Your Plan")} />

        {confirming ? (
          <Card>
            <div className="brand-row">
              <Loader2 size={18} />
              <span>
                <strong>{t("Confirming your payment…")}</strong>
                <br />
                <span className="small muted">
                  {t("Your card went through. This usually takes a few seconds.")}
                </span>
              </span>
            </div>
          </Card>
        ) : null}

        {status === "loading" && !billing ? (
          <Card>
            <span className="small muted">{t("Loading your plan…")}</span>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card>
            <strong>{t("Could not load your plan")}</strong>
            <p className="small muted">{error}</p>
            <Button icon={<RefreshCw size={16} />} onClick={() => void refresh()} variant="secondary">
              {t("Try again")}
            </Button>
          </Card>
        ) : null}

        {billing ? (
          <>
            <Card>
              <div className="premium-strip">
                <div>
                  <span className="eyebrow">{t("Current plan")}</span>
                  <h2 style={{ margin: "4px 0" }}>{t(TIER_LABELS[billing.tier])}</h2>
                </div>
                {billing.status ? (
                  <Badge variant={billing.status === "past_due" ? "cream" : "green"}>
                    {t(STATUS_LABELS[billing.status] ?? billing.status)}
                  </Badge>
                ) : null}
              </div>

              {copy ? <p className="small muted">{t(copy.tagline)}</p> : null}

              {renewsOn ? (
                <div className="list-row">
                  <span className="small muted">
                    {billing.cancel_at_period_end ? t("Access ends") : t("Renews")}
                  </span>
                  <strong>{renewsOn}</strong>
                </div>
              ) : null}

              {billing.cancel_at_period_end ? (
                <p className="small muted">
                  {t("Your plan is set to cancel. You keep everything until the date above.")}
                </p>
              ) : null}
            </Card>

            <Card className="section">
              <span className="eyebrow">{t("This month")}</span>
              <div className="form-grid" style={{ marginTop: 10 }}>
                {[
                  [t("Household members"), billing.entitlements.householdMembers],
                  [t("AI meal plans"), billing.entitlements.mealPlansPerMonth],
                  [t("Meals per plan"), billing.entitlements.maxMealsPerPlan],
                  [t("Camera scans"), billing.entitlements.scansPerMonth],
                ].map(([label, value]) => (
                  <div className="check-item" key={String(label)}>
                    <span className="small muted">{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: 12 }}>
                {t("Pantry, shopping lists and expiry alerts are unlimited on every plan.")}
              </p>
            </Card>

            <div className="footer-actions">
              {billing.tier === "free" ? (
                <Button fullWidth onClick={() => navigate("/pricing")}>
                  {t("See plans")}
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate("/pricing")} variant="secondary">
                    {t("Compare plans")}
                  </Button>
                  {/* Cancelling, switching plan and changing card all live in
                      Stripe's portal. Rebuilding those three screens would add
                      a second place for billing state to be wrong. */}
                  <Button
                    disabled={openingPortal}
                    icon={<CreditCard size={17} />}
                    onClick={() => void handlePortal()}
                  >
                    {openingPortal ? t("Opening…") : t("Manage billing")}
                  </Button>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}
