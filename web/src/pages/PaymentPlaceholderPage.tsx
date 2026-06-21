import { ArrowLeft, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function PaymentPlaceholderPage() {
  const navigate = useNavigate();

  return (
    <main className="app-shell">
      <div className="page page--centered">
        <Card variant="premium">
          <div style={{ display: "grid", justifyItems: "center", gap: 14, textAlign: "center" }}>
            <span className="feature-icon" style={{ width: 62, height: 62 }}>
              <CreditCard size={28} />
            </span>
            <div>
              <p className="eyebrow">Mock payment flow</p>
              <h1 style={{ margin: 0 }}>Payment Coming Soon</h1>
              <p className="muted">
                This prototype shows where Stripe Checkout will be integrated.
              </p>
            </div>
            <Button icon={<ArrowLeft size={18} />} onClick={() => navigate("/pricing")}>
              Back to Pricing
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
