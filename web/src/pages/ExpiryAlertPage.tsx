import { Loader2, RefreshCw, Snowflake, Utensils } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { expiryMascot } from "../assets/mascots";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useToast } from "../components/ui/Toast";
import { useExpiringItems } from "../hooks/useExpiringItems";
import { expiryTone, formatAmount, formatExpiryForLocale } from "../lib/pantryFormat";
import { useLocale } from "../context/LocaleContext";

const EXPIRY_WINDOW_DAYS = 7;

export function ExpiryAlertPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { locale, t } = useLocale();
  const { items, status, error, refresh } = useExpiringItems(EXPIRY_WINDOW_DAYS);
  const requestedId = searchParams.get("item");
  const selected = items.find((item) => item.id === requestedId) ?? items[0] ?? null;

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav backTo="/pantry" title="Expiry Alerts" />

        <section className="page-heading">
          <img
            alt="Mosaic Kitchen expiry reminder mascot"
            className="page-mascot"
            src={expiryMascot}
          />
          <h1>{t("Food Expiry Alerts")}</h1>
          <p>{t("Items already expired or expiring in the next 7 days.")}</p>
        </section>

        {status === "loading" ? (
          <Card className="section">
            <div className="brand-row">
              <Loader2 size={18} />
              <span className="small muted">{t("Checking your pantry…")}</span>
            </div>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card className="section">
            <strong>{t("Could not load expiry alerts")}</strong>
            <p className="small muted">{error}</p>
            <Button icon={<RefreshCw size={16} />} onClick={() => void refresh()} variant="secondary">
              {t("Try again")}
            </Button>
          </Card>
        ) : null}

        {status === "ready" && items.length === 0 ? (
          <Card className="section">
            <strong>{t("Nothing needs attention")}</strong>
            <p className="small muted">{t("No pantry items expire in the next 7 days.")}</p>
          </Card>
        ) : null}

        {items.length > 0 ? (
          <section className="section">
            <h2>{t("Needs attention")} ({items.length})</h2>
            <div className="form-grid">
              {items.map((item) => (
                <button
                  className="card expiry-row"
                  key={item.id}
                  onClick={() => setSearchParams({ item: item.id })}
                  style={{ padding: 14, textAlign: "left", width: "100%" }}
                  type="button"
                >
                  <span className="item-icon">{item.name.slice(0, 2)}</span>
                  <span style={{ flex: 1 }}>
                    <strong>{item.name}</strong>
                    <br />
                    <span className="small muted">{formatAmount(item) || t("Quantity not set")}</span>
                  </span>
                  <Badge variant={expiryTone(item.expires_on)}>{formatExpiryForLocale(item.expires_on, locale)}</Badge>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {selected ? (
          <section className="section">
            <Card variant="alert">
              <h2 style={{ color: "#b42318", marginTop: 0 }}>
                {selected.name}: {formatExpiryForLocale(selected.expires_on, locale)}
              </h2>
              <div className="list-row">
                <span className="item-icon">{selected.name.slice(0, 2)}</span>
                <span className="small muted">{t("Quantity")}</span>
                <strong>{formatAmount(selected) || t("Not set")}</strong>
              </div>
              <div className="list-row">
                <span />
                <span className="small muted">{t("Category")}</span>
                <strong style={{ textTransform: "capitalize" }}>{selected.category}</strong>
              </div>
            </Card>

            <h2>{t("Use it before it goes to waste")}</h2>
            <Card className="alert-choice">
              <span className="feature-icon"><Utensils size={20} /></span>
              <span>
                <strong>{t("Plan with your pantry")}</strong>
                <br />
                <span className="small muted">{t("Meal planning automatically reads this ingredient.")}</span>
              </span>
            </Card>
            <Button fullWidth icon={<Utensils size={18} />} onClick={() => navigate("/meal-plan") }>
              {t("Generate a Meal Plan")}
            </Button>
            <Button
              fullWidth
              icon={<Snowflake size={18} />}
              onClick={() => showToast(`Remember to freeze or preserve ${selected.name}`)}
              variant="ghost"
            >
              {t("Freeze or Preserve")}
            </Button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
