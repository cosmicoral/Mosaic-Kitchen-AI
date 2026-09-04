import { Camera, Clock, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { aiScanMascot } from "../assets/mascots";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useLocale } from "../context/LocaleContext";

// The scanning flow is not built. This page used to fake it: buttons that
// "selected a file", a hardcoded 94% accuracy badge, and a Scan button that
// navigated to a page of invented detections. None of it touched a camera or a
// model. Showing that to a paying user is worse than showing nothing, so the
// page now says plainly what it will do and what it cannot do yet.
export function AIVisionPage() {
  const navigate = useNavigate();
  const { t } = useLocale();

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav backTo="/dashboard" title={t("AI Vision Scan")} />

        <section className="section">
          <Card variant="dark">
            <div className="brand-row">
              <MascotAvatar size="md" src={aiScanMascot} />
              <span>
                <Badge variant="cream">{t("Coming soon")}</Badge>
                <h2 style={{ margin: "8px 0 4px" }}>{t("AI Food Vision")}</h2>
                <p className="small">
                  {t(
                    "Point your camera at a shelf or a receipt and have everything land in your pantry."
                  )}
                </p>
              </span>
            </div>
          </Card>

          <Card className="section">
            <div className="brand-row">
              <Clock size={18} />
              <span>
                <strong>{t("Not available yet")}</strong>
                <br />
                <span className="small muted">
                  {t(
                    "We are building this now. Until it ships, add pantry items by hand — everything else works from there."
                  )}
                </span>
              </span>
            </div>
          </Card>

          <h2>{t("What it will do")}</h2>
          <Card>
            <ul className="check-list">
              {[
                "Read a supermarket receipt and add every item at once",
                "Recognise what is on a fridge shelf",
                "Guess sensible expiry dates you can correct",
              ].map((line) => (
                <li key={line}>
                  <ScanLine size={17} />
                  <span>{t(line)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="footer-actions">
            <Button
              fullWidth
              icon={<Camera size={18} />}
              onClick={() => navigate("/pantry")}
            >
              {t("Add pantry items by hand")}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
