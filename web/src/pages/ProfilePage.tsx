import { Crown, Edit, LogOut, Save, Settings } from "lucide-react";
import { ChangeEvent, useState } from "react";
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
import { profile } from "../data/mockData";

type LocalProfile = {
  name: string;
  email: string;
  location: string;
  cultures: string[];
  dietaryNeeds: string[];
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [savedProfile, setSavedProfile] = useState<LocalProfile>({
    name: profile.name,
    email: profile.email,
    location: profile.location,
    cultures: profile.cultures,
    dietaryNeeds: profile.dietaryNeeds,
  });
  const [draftProfile, setDraftProfile] = useState<LocalProfile>({
    name: profile.name,
    email: profile.email,
    location: profile.location,
    cultures: profile.cultures,
    dietaryNeeds: profile.dietaryNeeds,
  });

  const updateField = (event: ChangeEvent<HTMLInputElement>) => {
    setDraftProfile((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const startEditing = () => {
    setDraftProfile(savedProfile);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftProfile(savedProfile);
    setIsEditing(false);
  };

  const saveChanges = () => {
    setSavedProfile(draftProfile);
    setIsEditing(false);
    showToast("Profile updated");
  };

  const toggleDraftChip = (field: "cultures" | "dietaryNeeds", value: string) => {
    setDraftProfile((current) => {
      const currentValues = current[field];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return { ...current, [field]: nextValues };
    });
  };

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <div className="profile-cover" />

        <Card className="profile-card">
          <MascotAvatar size="lg" src={genericAvatar} />
          {isEditing ? (
            <div className="form-grid" style={{ marginTop: 18, textAlign: "left" }}>
              <Input label="Display Name" name="name" onChange={updateField} value={draftProfile.name} />
              <Input label="Email" name="email" onChange={updateField} type="email" value={draftProfile.email} />
              <Input label="Location" name="location" onChange={updateField} value={draftProfile.location} />
            </div>
          ) : (
            <>
              <h1 style={{ marginBottom: 4 }}>{savedProfile.name}</h1>
              <p className="small muted">{savedProfile.email}</p>
              <Badge variant="cream">{profile.plan}</Badge>
            </>
          )}

          <div className="profile-actions" style={{ marginTop: 18 }}>
            {isEditing ? (
              <>
                <Button onClick={cancelEditing} variant="secondary">
                  Cancel
                </Button>
                <Button icon={<Save size={17} />} onClick={saveChanges}>
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button icon={<Edit size={17} />} onClick={startEditing} variant="secondary">
                  Edit Profile
                </Button>
                <Button icon={<Settings size={17} />} onClick={() => showToast("Settings are mocked for now")} variant="secondary">
                  Settings
                </Button>
              </>
            )}
          </div>
        </Card>

        <section className="section">
          <Card variant="premium">
            <div className="premium-strip">
              <span>
                <Badge variant="gold">Premium</Badge>
                <h2>Upgrade your kitchen intelligence</h2>
                <p className="small muted">Unlimited plans, AI Vision scanning and deeper pantry insights.</p>
              </span>
              <Crown color="var(--color-orange)" size={34} />
            </div>
            <Button fullWidth onClick={() => navigate("/pricing")} variant="premium">
              Upgrade
            </Button>
          </Card>

          <Card>
            <h2>Household Preferences</h2>
            <div className="summary-list">
              <div className="summary-row">
                <span className="small muted">Household size</span>
                <strong>{profile.householdSize} people</strong>
              </div>
              <div className="summary-row">
                <span className="small muted">Location</span>
                <strong>{savedProfile.location}</strong>
              </div>
              <div className="summary-row">
                <span className="small muted">Weekly budget</span>
                <strong>£{profile.weeklyBudget}</strong>
              </div>
            </div>
          </Card>

          <Card>
            <h2>Food Culture</h2>
            <div className={isEditing ? "chip-edit-grid" : "choice-grid"}>
              {["Chinese", "British", "Indian", "Pakistani", "Japanese", "Korean"].map((item) =>
                isEditing ? (
                  <button
                    className={`choice-pill${draftProfile.cultures.includes(item) ? " is-selected" : ""}`}
                    key={item}
                    onClick={() => toggleDraftChip("cultures", item)}
                    type="button"
                  >
                    {item}
                  </button>
                ) : savedProfile.cultures.includes(item) ? (
                  <Badge key={item} variant="green">
                    {item}
                  </Badge>
                ) : null,
              )}
            </div>
          </Card>

          <Card>
            <h2>Dietary Needs</h2>
            <div className={isEditing ? "chip-edit-grid" : "choice-grid"}>
              {["Halal", "No pork", "Vegetarian", "No beef", "Gluten free", "Dairy free"].map((item) =>
                isEditing ? (
                  <button
                    className={`choice-pill${draftProfile.dietaryNeeds.includes(item) ? " is-selected" : ""}`}
                    key={item}
                    onClick={() => toggleDraftChip("dietaryNeeds", item)}
                    type="button"
                  >
                    {item}
                  </button>
                ) : savedProfile.dietaryNeeds.includes(item) ? (
                  <Badge key={item} variant="cream">
                    {item}
                  </Badge>
                ) : null,
              )}
            </div>
          </Card>

          <Button
            fullWidth
            icon={<LogOut size={17} />}
            onClick={async () => {
              await logout();
              // replace, so Back does not return to a page the session no
              // longer authorises.
              navigate("/login", { replace: true });
            }}
            variant="secondary"
          >
            Log Out
          </Button>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
