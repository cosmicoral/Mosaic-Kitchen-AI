import { Check, Lock, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SocialSignIn } from "../components/SocialSignIn";
import { TopNav } from "../components/navigation/TopNav";
import { signupMascot } from "../assets/mascots";
import { AuthMascotPanel } from "../components/ui/AuthMascotPanel";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";
import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { isStrongPassword, passwordRequirements } from "../lib/passwordValidation";
import { useLocale } from "../context/LocaleContext";

export function SignupPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { signup } = useAuth();
  const { t } = useLocale();
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [agreed, setAgreed] = useState(false);
const [error, setError] = useState<string | null>(null);
const [submitting, setSubmitting] = useState(false);
const requirements = passwordRequirements(password);

async function handleSubmit(event: FormEvent) {
  event.preventDefault();
  setError(null);

  // Checked here rather than on the server: the backend has no idea the UI
  // asked for the password twice.
  if (password !== confirmPassword) {
    setError("Passwords do not match");
    return;
  }
  if (!isStrongPassword(password)) {
    setError("Please meet all password requirements");
    return;
  }
  if (!agreed) {
    setError("Please accept the Terms of Service to continue");
    return;
  }

  setSubmitting(true);
  try {
    await signup(email, password);
    navigate("/onboarding/user-info");
  } catch (submitError) {
    setError(submitError instanceof Error ? submitError.message : "Sign up failed");
  } finally {
    setSubmitting(false);
  }
}

  return (
    <main className="app-shell auth-shell">
      <div className="page auth-layout-page">
        <TopNav backTo="/" title="" />

        <div className="auth-desktop-grid">
          <AuthMascotPanel
            bullets={[
              "Pantry tracking",
              "Shopping lists",
              "Expiry reminders",
              "3 AI meal plans total",
            ].map(t)}
            src={signupMascot}
            subtitle={t("Create a free account and start planning meals that fit your household, budget, and food culture.")}
            title={t("Smarter meals start here")}
          />

          <section className="auth-form-panel">
            <section className="auth-head">
              <MascotAvatar size="lg" src={signupMascot} />
              <Badge variant="cream">{t("Free - No Card Required")}</Badge>
              <h1>{t("Join Mosaic Kitchen AI")}</h1>
              <p>{t("Create your free account and start planning meals in minutes.")}</p>
            </section>

            <form onSubmit={handleSubmit}>
              <Card>
                <div className="form-grid">
                  <Input
                    autoComplete="email"
                    icon={<Mail size={17} />}
                    label={t("Email Address")}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                  />
                  <Input
                    autoComplete="new-password"
                    icon={<Lock size={17} />}
                    label={t("Password")}
                    maxLength={200}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    type="password"
                    value={password}
                  />
                  <div aria-label="Password requirements" className="small" style={{ display: "grid", gap: 5 }}>
                    {requirements.map((requirement) => (
                      <span
                        key={requirement.label}
                        style={{
                          color: requirement.met ? "var(--color-primary-strong)" : "var(--color-text-muted, #667085)",
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        <Check aria-hidden="true" size={15} style={{ opacity: requirement.met ? 1 : 0.35 }} />
                        {t(requirement.label)}
                      </span>
                    ))}
                  </div>
                  <Input
                    autoComplete="new-password"
                    icon={<Lock size={17} />}
                    label={t("Confirm Password")}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t("Repeat your password")}
                    required
                    type="password"
                    value={confirmPassword}
                  />
                  <label className="small muted" style={{ display: "flex", gap: 8 }}>
                    <input
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      {t("I agree to the Terms of Service and Privacy Policy")}
                    </span>
                  </label>
                </div>
              </Card>

              {error ? (
                <p
                  className="small"
                  role="alert"
                  style={{ color: "var(--danger, #c0392b)", marginTop: 10 }}
                >
                  {t(error)}
                </p>
              ) : null}

              <Button
                disabled={submitting}
                fullWidth
                icon={<Check size={18} />}
                style={{ marginTop: 14 }}
                type="submit"
              >
                {submitting ? t("Creating account…") : t("Create Free Account")}
              </Button>
            </form>

            <SocialSignIn />

            <Card className="section auth-mobile-only" variant="dark">
              <div className="premium-strip">
                <strong>{t("Included in Free Account")}</strong>
                <Badge variant="green">{t("Free")}</Badge>
              </div>
              <ul className="check-list" style={{ marginTop: 16 }}>
                {[
                  "Pantry tracking",
                  "Shopping lists",
                  "Expiry reminders",
                  "Inventory management",
                  "English and Chinese support",
                  "3 AI meal plans total",
                ].map((item) => (
                  <li key={item}>
                    <Check size={17} />
                    <span>{t(item)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <p className="small muted" style={{ textAlign: "center" }}>
              {t("Already have an account?")}{" "}
              <Link className="text-link" to="/login">
                {t("Sign In")}
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
