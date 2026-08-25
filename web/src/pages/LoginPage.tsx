import { useState, type FormEvent } from "react";
import { Apple, Lock, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginMascot } from "../assets/mascots";
import { TopNav } from "../components/navigation/TopNav";
import { AuthMascotPanel } from "../components/ui/AuthMascotPanel";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Where RequireAuth wanted to send them before the redirect.
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  async function handleSubmit(event: FormEvent) {
    // Without this the browser reloads the page on submit and the state is lost.
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <div className="page page--centered auth-layout-page">
        <TopNav backTo="/" title="" />

        <div className="auth-desktop-grid">
          <AuthMascotPanel
            src={loginMascot}
            subtitle="Your AI kitchen assistant for multicultural households."
            title="Mosaic Kitchen AI"
          />

          <section className="auth-form-panel">
            <section className="auth-head">
              <MascotAvatar size="lg" src={loginMascot} />
              <h1>Welcome Back</h1>
              <p>Continue planning healthier meals, reducing food waste, and saving money.</p>
            </section>

            <form onSubmit={handleSubmit}>
              <Card>
                <div className="form-grid">
                  <Input
                    autoComplete="email"
                    icon={<Mail size={17} />}
                    label="Email Address"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                  />
                  <Input
                    autoComplete="current-password"
                    icon={<Lock size={17} />}
                    label="Password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    required
                    type="password"
                    value={password}
                  />
                  <Link className="text-link small" style={{ justifySelf: "end" }} to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>
              </Card>

              {error ? (
                <p className="small" role="alert" style={{ color: "var(--danger, #c0392b)", marginTop: 10 }}>
                  {error}
                </p>
              ) : null}

              <Button disabled={submitting} fullWidth style={{ marginTop: 14 }} type="submit">
                {submitting ? "Logging in…" : "Log In"}
              </Button>
            </form>

            <div className="auth-divider">OR</div>

            <div className="form-grid">
              <Button fullWidth onClick={() => showToast("Google login is not wired up yet")} variant="secondary">
                Continue with Google
              </Button>
              <Button
                fullWidth
                icon={<Apple size={18} />}
                onClick={() => showToast("Apple login is not wired up yet")}
                variant="secondary"
              >
                Continue with Apple
              </Button>
            </div>

            <Card className="section" variant="premium">
              <strong>Upgrade to Premium after logging in</strong>
              <p className="small muted">Unlock unlimited meal plans, AI Vision, and smarter pantry insights.</p>
              <Button fullWidth onClick={() => navigate("/pricing")} variant="premium">
                View Premium Plans
              </Button>
            </Card>

            <p className="small muted" style={{ textAlign: "center" }}>
              New to Mosaic Kitchen AI?{" "}
              <Link className="text-link" to="/signup">
                Create Free Account
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}