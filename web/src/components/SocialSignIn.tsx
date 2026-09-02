import { useSearchParams } from "react-router-dom";
import { Button } from "./ui/Button";
import { useLocale } from "../context/LocaleContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Mapped here rather than passed through from the server, so the API never has
// to return user-facing prose and these stay translatable.
const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "That sign-in did not complete. Please try again.",
  session_expired: "That sign-in took too long. Please try again.",
  provider_unavailable: "Google sign-in is unavailable right now.",
  unsupported_provider: "That sign-in method is not available.",
};

export function SocialSignIn() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();

  const errorCode = searchParams.get("error");
  // The backend passes a specific message through for the cases where the user
  // has to do something different — an email already registered with a
  // password, for instance.
  const detail = searchParams.get("message");

  function startGoogle() {
    // A full-page navigation, not fetch. The OAuth flow is a sequence of
    // redirects through Google's domain; XHR cannot follow it, and the state
    // cookie has to be set on a real navigation for the browser to send it
    // back on the callback.
    window.location.href = `${API_URL}/api/auth/google`;
  }

  return (
    <>
      {errorCode ? (
        <p
          className="small"
          role="alert"
          style={{ color: "var(--danger, #c0392b)", textAlign: "center" }}
        >
          {detail ?? t(ERROR_MESSAGES[errorCode] ?? "Sign-in failed. Please try again.")}
        </p>
      ) : null}

      <div className="auth-divider">{t("OR")}</div>

      <div className="form-grid">
        <Button fullWidth onClick={startGoogle} variant="secondary">
          {t("Continue with Google")}
        </Button>

        {/* Sign in with Apple is deliberately absent rather than disabled.
            It needs a paid Apple Developer account and a verified HTTPS
            domain, and Apple's own rule is that an app offering third-party
            sign-in must also offer theirs — so it arrives with the iOS build,
            not before. A greyed-out button here would only advertise
            something that does not exist. */}
      </div>
    </>
  );
}
