import { LifeBuoy } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { loginMascot } from "../assets/mascots";
import { SocialSignIn } from "../components/SocialSignIn";
import { TopNav } from "../components/navigation/TopNav";
import { AuthMascotPanel } from "../components/ui/AuthMascotPanel";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useLocale } from "../context/LocaleContext";

const SUPPORT_EMAIL = "support@mosaickitchen.ai";

// Self-service password reset needs a verified sending domain, which does not
// exist yet. Until it does, this page says so. The previous version showed a
// "Reset link sent" confirmation and sent nothing — which left someone locked
// out of their account and waiting for an email that was never coming.
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useLocale();

  return (
    <main className="app-shell auth-shell">
      <div className="page page--centered auth-layout-page">
        <TopNav backTo="/login" title="" />

        <div className="auth-desktop-grid">
          <AuthMascotPanel
            src={loginMascot}
            subtitle={t("We will help you get back to planning healthier, lower-waste meals.")}
            title={t("Reset your Mosaic Kitchen access")}
          />

          <section className="auth-form-panel">
            <section className="auth-head">
              <MascotAvatar size="lg" src={loginMascot} />
              <h1>{t("Forgot Your Password?")}</h1>
              <p>
                {t(
                  "Self-service password reset is not available yet. Here are two ways back in."
                )}
              </p>
            </section>

            <Card>
              <strong>{t("If you signed up with Google")}</strong>
              <p className="small muted">
                {t("Use the Google button below — there is no password to reset.")}
              </p>
            </Card>

            <Card className="section">
              <div className="brand-row">
                <LifeBuoy size={18} />
                <span>
                  <strong>{t("If you signed up with an email and password")}</strong>
                  <br />
                  <span className="small muted">
                    {t("Email us and we will reset it for you, usually within a day.")}
                  </span>
                </span>
              </div>
              <Button
                fullWidth
                onClick={() => {
                  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                    "Password reset"
                  )}`;
                }}
                style={{ marginTop: 14 }}
                variant="secondary"
              >
                {SUPPORT_EMAIL}
              </Button>
            </Card>

            <SocialSignIn />

            <p className="small muted" style={{ textAlign: "center", marginTop: 14 }}>
              <Link className="text-link" to="/login">
                {t("Back To Login")}
              </Link>
              {" · "}
              <button className="text-link" onClick={() => navigate("/signup")} type="button">
                {t("Create an account")}
              </button>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
