import { Crown, Edit, Loader2, LogOut, RefreshCw, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { genericAvatar } from "../assets/mascots";
import { BottomNav } from "../components/navigation/BottomNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { profileToInput } from "../lib/profile";
import {
  COMMON_AVOIDANCES,
  COOKING_STYLE_LABELS,
  CUISINE_LABELS,
  PRIORITY_LABELS,
} from "../lib/profileOptions";
import { CUISINES, type Cuisine, type UserProfileInput } from "../types";
import { useLocale } from "../context/LocaleContext";

export function ProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const { profile, status, error, refresh, save } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfileInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The draft can only be seeded once the profile has arrived, and the profile
  // arrives after the first render.
  useEffect(() => {
    if (profile && !isEditing) setDraft(profileToInput(profile));
  }, [profile, isEditing]);

  function startEditing() {
    if (!profile) return;
    setDraft(profileToInput(profile));
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    // Discard by re-seeding from the server copy, so a cancelled edit leaves
    // nothing behind.
    if (profile) setDraft(profileToInput(profile));
    setSaveError(null);
    setIsEditing(false);
  }

  function updateDraft(patch: Partial<UserProfileInput>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function toggleCuisine(cuisine: Cuisine) {
    if (!draft) return;
    updateDraft({
      cuisines: draft.cuisines.includes(cuisine)
        ? draft.cuisines.filter((entry) => entry !== cuisine)
        : [...draft.cuisines, cuisine],
    });
  }

  function toggleAvoidance(ingredient: string) {
    if (!draft) return;
    updateDraft({
      avoid_ingredients: draft.avoid_ingredients.includes(ingredient)
        ? draft.avoid_ingredients.filter((entry) => entry !== ingredient)
        : [...draft.avoid_ingredients, ingredient],
    });
  }

  async function saveChanges() {
    if (!draft) return;
    setSaveError(null);
    setSaving(true);

    try {
      // The whole draft goes back, not just what changed: PUT replaces the row.
      await save(draft);
      setIsEditing(false);
      showToast("Profile updated");
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  const householdTotal = profile
    ? profile.adults + profile.teenagers + profile.children + profile.toddlers
    : 0;

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <div className="profile-cover" />

        <Card className="profile-card">
          <MascotAvatar size="lg" src={genericAvatar} />
          {/* Email lives on the account, not the profile, so it comes from the
              auth context and is not editable here. */}
          <h1 style={{ marginBottom: 4 }}>{user?.email ?? t("Your account")}</h1>
          <Badge variant="cream">{t("Free Account")}</Badge>

          <div className="profile-actions" style={{ marginTop: 18 }}>
            {isEditing ? (
              <>
                <Button disabled={saving} onClick={cancelEditing} variant="secondary">
                  {t("Cancel")}
                </Button>
                <Button disabled={saving} icon={<Save size={17} />} onClick={() => void saveChanges()}>
                  {saving ? t("Saving…") : t("Save Changes")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  disabled={!profile}
                  icon={<Edit size={17} />}
                  onClick={startEditing}
                  variant="secondary"
                >
                  {t("Edit Preferences")}
                </Button>
                <Button
                  icon={<Settings size={17} />}
                  onClick={() => showToast("Settings are not built yet")}
                  variant="secondary"
                >
                  {t("Settings")}
                </Button>
              </>
            )}
          </div>
        </Card>

        <section className="section">
          {status === "loading" ? (
            <Card>
              <div className="brand-row">
                <Loader2 size={18} />
                <span className="small muted">{t("Loading your preferences…")}</span>
              </div>
            </Card>
          ) : null}

          {status === "error" ? (
            <Card>
              <strong>{t("Could not load your preferences")}</strong>
              <p className="small muted">{error}</p>
              <Button icon={<RefreshCw size={16} />} onClick={() => void refresh()} variant="secondary">
                {t("Try again")}
              </Button>
            </Card>
          ) : null}

          {/* A null profile is not an error — the account exists but onboarding
              was never finished. */}
          {status === "ready" && !profile ? (
            <Card>
              <strong>{t("You have not set up your preferences yet")}</strong>
              <p className="small muted">
                {t("Tell us who you cook for and we can start planning meals around it.")}
              </p>
              <Button fullWidth onClick={() => navigate("/onboarding/user-info")}>
                {t("Set up preferences")}
              </Button>
            </Card>
          ) : null}

          {profile ? (
            <>
              <Card variant="premium">
                <div className="premium-strip">
                  <span>
                    <Badge variant="gold">{t("Premium")}</Badge>
                    <h2>{t("Upgrade your kitchen intelligence")}</h2>
                    <p className="small muted">
                      {t("Unlimited plans, AI Vision scanning and deeper pantry insights.")}
                    </p>
                  </span>
                  <Crown color="var(--color-orange)" size={34} />
                </div>
                <Button fullWidth onClick={() => navigate("/pricing")} variant="premium">
                  {t("Upgrade")}
                </Button>
              </Card>

              <Card>
                <h2>{t("Household")}</h2>
                {isEditing && draft ? (
                  <div className="form-grid" style={{ marginTop: 12 }}>
                    {(
                      [
                        ["adults", "Adults", "18 and over"],
                        ["teenagers", "Teenagers", "13 to 17"],
                        ["children", "Children", "5 to 12"],
                        ["toddlers", "Toddlers", "1 to 4"],
                      ] as const
                    ).map(([key, label, hint]) => (
                      <Input
                        helper={t(hint)}
                        key={key}
                        label={t(label)}
                        max="20"
                        min="0"
                        onChange={(event) =>
                          updateDraft({ [key]: Number(event.target.value) } as Partial<UserProfileInput>)
                        }
                        type="number"
                        value={draft[key]}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="summary-list">
                    <div className="summary-row">
                      <span className="small muted">{t("Cooking for")}</span>
                      <strong>
                        {householdTotal} {t(householdTotal === 1 ? "person" : "people")}
                      </strong>
                    </div>
                    <div className="summary-row">
                      <span className="small muted">{t("Adults / teens / children / toddlers")}</span>
                      <strong>
                        {profile.adults} / {profile.teenagers} / {profile.children} / {profile.toddlers}
                      </strong>
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <h2>{t("Planning")}</h2>
                {isEditing && draft ? (
                  <div className="form-grid" style={{ marginTop: 12 }}>
                    <Input
                      label={t("Meals per week")}
                      max="21"
                      min="1"
                      onChange={(event) => updateDraft({ meals_per_week: Number(event.target.value) })}
                      type="number"
                      value={draft.meals_per_week}
                    />
                    <Input
                      label={t("Weekly budget (£)")}
                      min="0"
                      onChange={(event) =>
                        updateDraft({
                          weekly_budget:
                            event.target.value.trim() === "" ? null : Number(event.target.value),
                        })
                      }
                      placeholder="80"
                      step="0.01"
                      type="number"
                      value={draft.weekly_budget ?? ""}
                    />
                    <Input
                      helper="Used later to show shops and prices near you."
                      label={t("Postcode")}
                      maxLength={8}
                      onChange={(event) =>
                        updateDraft({
                          postcode: event.target.value.trim() === "" ? null : event.target.value,
                        })
                      }
                      placeholder="SW1A 1AA"
                      value={draft.postcode ?? ""}
                    />
                  </div>
                ) : (
                  <div className="summary-list">
                    <div className="summary-row">
                      <span className="small muted">{t("Meals per week")}</span>
                      <strong>{profile.meals_per_week}</strong>
                    </div>
                    <div className="summary-row">
                      <span className="small muted">{t("Weekly budget")}</span>
                      <strong>
                        {profile.weekly_budget ? `£${Number(profile.weekly_budget).toFixed(2)}` : t("Not set")}
                      </strong>
                    </div>
                    <div className="summary-row">
                      <span className="small muted">{t("Postcode")}</span>
                      <strong>{profile.postcode ?? t("Not set")}</strong>
                    </div>
                    <div className="summary-row">
                      <span className="small muted">{t("Cooking style")}</span>
                      <strong>
                        {profile.cooking_style ? t(COOKING_STYLE_LABELS[profile.cooking_style]) : t("Not set")}
                      </strong>
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <h2>{t("Cuisines")}</h2>
                <div className="choice-grid" style={{ marginTop: 12 }}>
                  {isEditing && draft
                    ? CUISINES.map((cuisine) => (
                        <button
                          className={`choice-pill${draft.cuisines.includes(cuisine) ? " is-selected" : ""}`}
                          key={cuisine}
                          onClick={() => toggleCuisine(cuisine)}
                          type="button"
                        >
                          {t(CUISINE_LABELS[cuisine])}
                        </button>
                      ))
                    : profile.cuisines.map((cuisine) => (
                        <Badge key={cuisine} variant="green">
                          {t(CUISINE_LABELS[cuisine])}
                        </Badge>
                      ))}
                  {!isEditing && profile.cuisines.length === 0 ? (
                    <span className="small muted">{t("None selected")}</span>
                  ) : null}
                </div>
              </Card>

              <Card>
                <h2>{t("Avoiding")}</h2>
                <div className="choice-grid" style={{ marginTop: 12 }}>
                  {isEditing && draft ? (
                    <>
                      {/* Anything typed during onboarding stays visible even if
                          it is not one of the common shortcuts. */}
                      {[...new Set([...COMMON_AVOIDANCES, ...draft.avoid_ingredients])].map(
                        (ingredient) => (
                          <button
                            className={`choice-pill${draft.avoid_ingredients.includes(ingredient) ? " is-selected" : ""}`}
                            key={ingredient}
                            onClick={() => toggleAvoidance(ingredient)}
                            type="button"
                          >
                            {ingredient}
                          </button>
                        )
                      )}
                    </>
                  ) : (
                    profile.avoid_ingredients.map((ingredient) => (
                      <Badge key={ingredient} variant="cream">
                        {ingredient}
                      </Badge>
                    ))
                  )}
                  {!isEditing && profile.avoid_ingredients.length === 0 ? (
                    <span className="small muted">{t("Nothing excluded")}</span>
                  ) : null}
                </div>
              </Card>

              {!isEditing && profile.priorities.length > 0 ? (
                <Card>
                  <h2>{t("Priorities")}</h2>
                  <div className="choice-grid" style={{ marginTop: 12 }}>
                    {profile.priorities.map((priority) => (
                      <Badge key={priority} variant="green">
                        {t(PRIORITY_LABELS[priority])}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ) : null}

              {saveError ? (
                <p className="small" role="alert" style={{ color: "var(--danger, #c0392b)" }}>
                  {saveError}
                </p>
              ) : null}
            </>
          ) : null}

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
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
