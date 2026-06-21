import { Apple, Lock, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { TopNav } from "../components/navigation/TopNav";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";

export function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <main className="app-shell">
      <div className="page page--centered">
        <TopNav backTo="/" title="" />

        <section className="auth-head">
          <MascotAvatar size="lg" />
          <h1>Welcome Back</h1>
          <p>Continue planning healthier meals, reducing food waste, and saving money.</p>
        </section>

        <Card>
          <form className="form-grid">
            <Input icon={<Mail size={17} />} label="Email Address" placeholder="you@example.com" type="email" />
            <Input icon={<Lock size={17} />} label="Password" placeholder="Your password" type="password" />
            <Link className="text-link small" style={{ justifySelf: "end" }} to="/forgot-password">
              Forgot password?
            </Link>
          </form>
        </Card>

        <Button fullWidth onClick={() => navigate("/dashboard")} style={{ marginTop: 14 }}>
          Log In
        </Button>

        <div className="auth-divider">OR</div>

        <div className="form-grid">
          <Button fullWidth onClick={() => showToast("Google login is mocked in this prototype")} variant="secondary">
            Continue with Google
          </Button>
          <Button
            fullWidth
            icon={<Apple size={18} />}
            onClick={() => showToast("Apple login is mocked in this prototype")}
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
      </div>
    </main>
  );
}
