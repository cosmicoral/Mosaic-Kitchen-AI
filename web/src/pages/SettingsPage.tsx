import { AlertTriangle, Check, Download, KeyRound, Loader2, LogOut, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "../components/navigation/BottomNav";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { SkeletonList } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import {
  changePassword,
  deleteAccount,
  downloadData,
  fetchAccount,
  type AccountOverview,
} from "../lib/account";
import { ApiError } from "../lib/api";
import { isStrongPassword, passwordRequirements } from "../lib/passwordValidation";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  apple: "Apple",
};

export function SettingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLocale();
  const { logout } = useAuth();

  const [account, setAccount] = useState<AccountOverview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [exporting, setExporting] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchAccount()
      .then(({ account: loaded }) => {
        if (cancelled) return;
        setAccount(loaded);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Could not load your account");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const requirements = passwordRequirements(newPassword);
  const passwordReady =
    currentPassword.length > 0 &&
    isStrongPassword(newPassword) &&
    currentPassword !== newPassword;

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setSavingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      showToast(t("Password changed"));
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Could not change your password"
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadData();
      showToast(t("Your data has been downloaded"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not export your data");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(event: FormEvent) {
    event.preventDefault();
    setDeleteError(null);
    setDeleting(true);

    try {
      await deleteAccount(confirmEmail);
      // The session went with the account, so there is nothing to log out of.
      // replace: true, or the back button returns to a page that will 401.
      navigate("/", { replace: true });
    } catch (error) {
      setDeleteError(
        error instanceof ApiError ? error.message : "Could not delete your account"
      );
      setDeleting(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <TopNav title="Settings" />

        <section className="page-heading">
          <h1>{t("Settings")}</h1>
          <p>{t("Your account, your data, and how you sign in.")}</p>
        </section>

        {status === "loading" ? <SkeletonList count={3} label={t("Loading…")} /> : null}

        {status === "error" ? (
          <Card>
            <strong>{t("Could not load your account")}</strong>
            <p className="small muted">{loadError}</p>
          </Card>
        ) : null}

        {account ? (
          <>
            <Card>
              <h2>{t("How you sign in")}</h2>
              <div className="summary-list" style={{ marginTop: 12 }}>
                <div className="summary-row">
                  <span className="small muted">{t("Email")}</span>
                  <strong style={{ overflowWrap: "anywhere" }}>{account.email}</strong>
                </div>
                <div className="summary-row">
                  <span className="small muted">{t("Sign-in method")}</span>
                  <span className="choice-grid">
                    {account.providers.map((provider) => (
                      <Badge key={provider} variant="green">
                        {PROVIDER_LABELS[provider] ?? provider}
                      </Badge>
                    ))}
                    {account.has_password ? (
                      <Badge variant="cream">{t("Password")}</Badge>
                    ) : null}
                  </span>
                </div>
              </div>

              {/* Said plainly rather than left as a missing form. An account
                  created through Google has no password, and "set one" is a
                  different and more dangerous action than "change one" — it
                  adds a second way in, so it needs email confirmation the app
                  cannot send yet. */}
              {!account.has_password ? (
                <p className="tiny muted" style={{ marginTop: 12 }}>
                  {t("This account signs in with Google, so it has no password to change. Setting one adds a new way into your account, so it needs email confirmation — that is not built yet.")}
                </p>
              ) : null}

              <p className="tiny muted" style={{ marginTop: 12 }}>
                {t("Changing your email address needs a confirmation sent to the new address. That is not built yet.")}
              </p>
            </Card>

            {account.has_password ? (
              <Card>
                <h2>{t("Change password")}</h2>
                <form onSubmit={handlePasswordSubmit} style={{ marginTop: 12 }}>
                  <Input
                    autoComplete="current-password"
                    label={t("Current password")}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    type="password"
                    value={currentPassword}
                  />
                  <div style={{ marginTop: 12 }}>
                    <Input
                      autoComplete="new-password"
                      label={t("New password")}
                      onChange={(event) => setNewPassword(event.target.value)}
                      type="password"
                      value={newPassword}
                    />
                  </div>

                  {/* The same rules the API enforces, shown while typing rather
                      than as a rejection afterwards. */}
                  {newPassword.length > 0 ? (
                    <ul className="check-list" style={{ marginTop: 12 }}>
                      {requirements.map((requirement) => (
                        <li key={requirement.label}>
                          <span className={`small${requirement.met ? "" : " muted"}`}>
                            {requirement.met ? <Check size={13} /> : "·"} {t(requirement.label)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {passwordError ? (
                    <p className="small" role="alert" style={{ color: "var(--color-red)", marginTop: 12 }}>
                      {passwordError}
                    </p>
                  ) : null}

                  <Button
                    disabled={!passwordReady || savingPassword}
                    fullWidth
                    icon={savingPassword ? <Loader2 size={17} /> : <KeyRound size={17} />}
                    style={{ marginTop: 16 }}
                    type="submit"
                  >
                    {savingPassword ? t("Saving…") : t("Change password")}
                  </Button>
                </form>
              </Card>
            ) : null}

            <Card>
              <h2>{t("Export your data")}</h2>
              <p className="small muted" style={{ marginTop: 4 }}>
                {t("A JSON file containing your profile, pantry, meal plans and shopping list. Nothing is summarised or left out.")}
              </p>
              <Button
                disabled={exporting}
                fullWidth
                icon={<Download size={17} />}
                onClick={() => void handleExport()}
                style={{ marginTop: 16 }}
                variant="secondary"
              >
                {exporting ? t("Preparing…") : t("Download my data")}
              </Button>
            </Card>

            <Button
              fullWidth
              icon={<LogOut size={17} />}
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
              variant="secondary"
            >
              {t("Log Out")}
            </Button>

            {/* Last, and visually separate. This is the one action on the page
                that cannot be undone. */}
            <Card className="danger-card">
              <div className="brand-row">
                <AlertTriangle color="var(--color-red)" size={20} />
                <h2 style={{ margin: 0 }}>{t("Delete your account")}</h2>
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>
                {t("This removes your profile, pantry, meal plans and shopping list permanently. There is no undo and no backup you can ask us to restore from.")}
              </p>
              <p className="small muted" style={{ marginTop: 8 }}>
                {t("Any active subscription is cancelled at the same time. Consider downloading your data first.")}
              </p>

              {confirmingDelete ? (
                <form onSubmit={handleDelete} style={{ marginTop: 16 }}>
                  <Input
                    autoComplete="off"
                    helper={account.email}
                    label={t("Type your email address to confirm")}
                    onChange={(event) => setConfirmEmail(event.target.value)}
                    value={confirmEmail}
                  />

                  {deleteError ? (
                    <p className="small" role="alert" style={{ color: "var(--color-red)", marginTop: 12 }}>
                      {deleteError}
                    </p>
                  ) : null}

                  <div className="profile-actions profile-actions--editing" style={{ marginTop: 16 }}>
                    <Button
                      disabled={deleting}
                      onClick={() => {
                        setConfirmingDelete(false);
                        setConfirmEmail("");
                        setDeleteError(null);
                      }}
                      type="button"
                      variant="secondary"
                    >
                      {t("Cancel")}
                    </Button>
                    <Button
                      // Matched here as well as on the server, so the button
                      // cannot be pressed until the confirmation is real.
                      disabled={
                        deleting ||
                        confirmEmail.trim().toLowerCase() !== account.email.toLowerCase()
                      }
                      icon={<Trash2 size={17} />}
                      type="submit"
                      variant="danger"
                    >
                      {deleting ? t("Deleting…") : t("Delete for ever")}
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  fullWidth
                  icon={<Trash2 size={17} />}
                  onClick={() => setConfirmingDelete(true)}
                  style={{ marginTop: 16 }}
                  variant="secondary"
                >
                  {t("Delete your account")}
                </Button>
              )}
            </Card>
          </>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}
