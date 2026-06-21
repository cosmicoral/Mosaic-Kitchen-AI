import { Apple, Check, Lock, Mail, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";

export function SignupPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav backTo="/" title="" />

        <section className="auth-head">
          <MascotAvatar size="lg" />
          <Badge variant="cream">Free - No Card Required</Badge>
          <h1>Join Mosaic Kitchen AI</h1>
          <p>Create your free account and start planning meals in minutes.</p>
        </section>

        <Card>
          <form className="form-grid">
            <Input icon={<User size={17} />} label="Full Name" placeholder="Your name" />
            <Input icon={<Mail size={17} />} label="Email Address" placeholder="you@example.com" type="email" />
            <Input icon={<Lock size={17} />} label="Password" placeholder="Min. 6 characters" type="password" />
            <Input icon={<Lock size={17} />} label="Confirm Password" placeholder="Repeat your password" type="password" />
            <label className="small muted" style={{ display: "flex", gap: 8 }}>
              <input type="checkbox" />
              <span>
                I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>
              </span>
            </label>
          </form>
        </Card>

        <Button
          fullWidth
          icon={<Check size={18} />}
          onClick={() => navigate("/onboarding/user-info")}
          style={{ marginTop: 14 }}
        >
          Create Free Account
        </Button>

        <div className="auth-divider">OR</div>

        <div className="form-grid">
          <Button fullWidth onClick={() => showToast("Google signup is mocked in this prototype")} variant="secondary">
            Continue with Google
          </Button>
          <Button
            fullWidth
            icon={<Apple size={18} />}
            onClick={() => showToast("Apple signup is mocked in this prototype")}
            variant="secondary"
          >
            Continue with Apple
          </Button>
        </div>

        <Card className="section" variant="dark">
          <div className="premium-strip">
            <strong>Included in Free Account</strong>
            <Badge variant="green">Free</Badge>
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
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <p className="small muted" style={{ textAlign: "center" }}>
          Already have an account?{" "}
          <Link className="text-link" to="/login">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
