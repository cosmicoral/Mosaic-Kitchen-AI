import { Camera, Check, History, ImagePlus, ScanLine } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiScanMascot } from "../assets/mascots";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";
import { iconMap } from "../data/mockData";

export function AIVisionPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [mockFileState, setMockFileState] = useState<string | null>(null);

  const chooseMockFile = (source: string) => {
    setMockFileState(source);
    showToast(`${source} selected for mock scan`);
  };

  return (
    <main className="app-shell">
      <div className="page">
        <TopNav
          backTo="/dashboard"
          onRightAction={() => showToast("Vision scan history is mocked")}
          rightLabel="History"
          title="AI Vision Scan"
        />

        <section className="section">
          <Card variant="dark">
            <div className="brand-row">
              <MascotAvatar size="md" src={aiScanMascot} />
              <span>
                <Badge variant="cream">Powered by Computer Vision</Badge>
                <h2 style={{ margin: "8px 0 4px" }}>AI Food Vision</h2>
                <p className="small">
                  Detect ingredients in seconds with computer vision and machine learning.
                </p>
              </span>
            </div>
            <div className="choice-grid" style={{ marginTop: 16 }}>
              <Badge variant="dark">Ingredient recognition</Badge>
              <Badge variant="dark">Real-time detection</Badge>
              <Badge variant="dark">94% accuracy</Badge>
            </div>
          </Card>

          <section className="page-heading">
            <img
              className="page-mascot"
              src={aiScanMascot}
              alt="Mosaic Kitchen mascot scanning food in a fridge"
            />
            <h1>Scan Your Fridge</h1>
            <p>Take a photo of your fridge, pantry or groceries. AI will identify ingredients automatically.</p>
          </section>

          <div className="vision-dropzone">
            <span>
              <span className="feature-icon" style={{ margin: "0 auto 12px" }}>
                <Camera size={22} />
              </span>
              <strong>Take Photo</strong>
              <br />
              <span className="small muted">or upload an image</span>
              <div className="two-col" style={{ marginTop: 14 }}>
                <Button icon={<Camera size={16} />} onClick={() => chooseMockFile("Photo")} variant="secondary">
                  Take Photo
                </Button>
                <Button icon={<ImagePlus size={16} />} onClick={() => chooseMockFile("Image upload")} variant="secondary">
                  Upload Image
                </Button>
              </div>
              {mockFileState ? (
                <Card className="section" variant="soft">
                  <strong>{mockFileState} ready</strong>
                  <span className="small muted">This is a local mock file state.</span>
                </Card>
              ) : null}
              <div className="choice-grid" style={{ justifyContent: "center", marginTop: 14 }}>
                <Badge variant="green">Fridge</Badge>
                <Badge variant="green">Pantry</Badge>
                <Badge variant="green">Groceries</Badge>
              </div>
            </span>
          </div>

          <h2>Example Detection</h2>
          <Card className="example-detection">
            <div className="food-icon-strip">
              {["spinach", "egg", "chicken", "tomato", "milk", "rice"].map((icon) => (
                <span key={icon}>{iconMap[icon]}</span>
              ))}
            </div>
            <p className="eyebrow">Demo - Detected Ingredients</p>
            <div className="choice-grid">
              {["Spinach 98%", "Eggs 97%", "Chicken Breast 94%", "Tomatoes 92%"].map((item) => (
                <Badge key={item} variant="cream">
                  <Check size={13} /> {item}
                </Badge>
              ))}
            </div>
          </Card>

          <Button
            fullWidth
            icon={<ScanLine size={18} />}
            onClick={() => navigate("/detection-results")}
          >
            Scan My Food
          </Button>
          <p className="tiny muted" style={{ textAlign: "center" }}>
            Photos are processed locally in this mock interface.
          </p>
        </section>
      </div>
    </main>
  );
}
