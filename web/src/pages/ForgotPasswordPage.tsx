import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { loginMascot } from "../assets/mascots";
import { TopNav } from "../components/navigation/TopNav";
import { AuthMascotPanel } from "../components/ui/AuthMascotPanel";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";

export function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false);
  const { showToast } = useToast();

  const sendResetLink = () => {
    setIsSent(true);
    showToast("Reset link sent");
  };

  return (
    <main className="app-shell auth-shell">
      <div className="page page--centered auth-layout-page">
        <TopNav backTo="/login" title="" />

        <div className="auth-desktop-grid">
          <AuthMascotPanel
            src={loginMascot}
            subtitle="We will help you get back to planning healthier, lower-waste meals."
            title="Reset your Mosaic Kitchen access"
          />

          <section className="auth-form-panel">
            <section className="auth-head">
              <MascotAvatar size="lg" src={loginMascot} />
              <h1>Forgot Your Password?</h1>
              <p>No worries. Enter your email address and we will send you a secure reset link.</p>
            </section>

            <Card>
              <form className="form-grid">
                <Input icon={<Mail size={17} />} label="Email Address" placeholder="you@example.com" type="email" />
              </form>
            </Card>

            {isSent ? (
              <Card className="section" variant="soft">
                <strong>Check your inbox</strong>
                <p className="small muted">
                  We sent a mock reset link to your email address. No real email is sent yet.
                </p>
              </Card>
            ) : null}

            <Button fullWidth icon={<Send size={17} />} onClick={sendResetLink} style={{ marginTop: 14 }}>
              Send Reset Link
            </Button>

            <p className="small muted" style={{ textAlign: "center" }}>
              <Link className="text-link" to="/login">
                Back To Login
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
