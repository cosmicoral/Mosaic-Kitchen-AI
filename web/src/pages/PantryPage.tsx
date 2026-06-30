import { Camera, ChevronDown, Filter, Plus, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { pantryMascot } from "../assets/mascots";
import { BottomNav } from "../components/navigation/BottomNav";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";
import { iconMap, pantryCategories } from "../data/mockData";

export function PantryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showAllExpiring, setShowAllExpiring] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const expiringItems = [
    ["Spinach", "Expires in 2 days", "spinach"],
    ["Chicken Breast", "Expires tomorrow", "chicken"],
    ["Milk", "Expires in 3 days", "milk"],
    ["Eggs", "Expires in 6 days", "egg"],
    ["Tomatoes", "Expires in 4 days", "tomato"],
  ];
  const visibleExpiringItems = showAllExpiring ? expiringItems : expiringItems.slice(0, 3);

  const addIngredient = () => {
    setIsAddModalOpen(false);
    showToast("Ingredient added to mock pantry");
  };

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <TopNav
          onRightAction={() => setIsFilterOpen((open) => !open)}
          rightLabel="Filter"
          showBack={false}
          title="My Kitchen"
        />

        <section className="page-heading">
          <h1>My Kitchen</h1>
          <p>Track ingredients, reduce food waste and cook smarter.</p>
        </section>

        <Card variant="dark">
          <div className="pantry-overview">
            <span>
              <p className="eyebrow" style={{ color: "#bfea73" }}>
                Pantry overview
              </p>
              <h2 style={{ margin: 0 }}>12 ingredients stored</h2>
              <p>
                <strong>£43</strong> pantry value
                <br />
                <strong>£18 this month</strong> waste prevented
              </p>
              <div className="choice-grid">
                <Badge variant="dark">Mostly healthy</Badge>
                <Badge variant="dark">3 expiring</Badge>
                <Badge variant="dark">Well stocked</Badge>
              </div>
            </span>
            <span className="score-ring">
              <strong>84</strong>
              <span className="tiny">Score</span>
            </span>
          </div>
        </Card>

        {isFilterOpen ? (
          <Card className="section filter-panel" variant="soft">
            <div className="brand-row">
              <Filter size={18} />
              <strong>Filter Pantry</strong>
            </div>
            <div className="choice-grid">
              {["Expiring soon", "Vegetables", "Protein", "Well stocked", "Needs restock"].map((filter, index) => (
                <button className={`choice-pill${index === 0 ? " is-selected" : ""}`} key={filter} type="button">
                  {filter}
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        <div className="section-title">
          <h2>Expiring Soon</h2>
          <button className="top-nav__right" onClick={() => setShowAllExpiring((showAll) => !showAll)} type="button">
            {showAllExpiring ? "Show Less" : "See All"}
          </button>
        </div>

        <section className="form-grid">
          {visibleExpiringItems.map(([name, expiry, icon]) => (
            <Card className="alert-choice" key={name}>
              <span className="item-icon">{iconMap[icon]}</span>
              <span>
                <strong>{name}</strong>
                <br />
                <Badge variant={expiry.includes("tomorrow") ? "red" : "gold"}>{expiry}</Badge>
              </span>
              <Button onClick={() => navigate("/expiry-alert")} variant="primary">
                Use Fresh
              </Button>
            </Card>
          ))}
        </section>

        <div className="section-title">
          <h2>Pantry Categories</h2>
          <button className="top-nav__right" onClick={() => setIsAddModalOpen(true)} type="button">
            Add Item
          </button>
        </div>

        <section className="form-grid">
          {pantryCategories.map((category, index) => (
            <Card className="category-card" key={category.name}>
              <div className="category-head">
                <span className="brand-row">
                  <span className="item-icon">{iconMap[category.icon]}</span>
                  <span>
                    <strong>{category.name}</strong>
                    <br />
                    <span className="small muted">{category.count}</span>
                  </span>
                </span>
                <ChevronDown size={18} />
              </div>
              {index === 0
                ? category.items.map((item) => (
                    <div className="check-item" key={item.name}>
                      <span className="check-circle" />
                      <span>
                        <strong>{item.name}</strong>
                        <br />
                        <span className="small muted">{item.amount}</span>
                      </span>
                      <Badge variant={item.tone === "gold" ? "gold" : "green"}>{item.expiresIn}</Badge>
                    </div>
                  ))
                : null}
            </Card>
          ))}
        </section>

        <Card className="section suggestion-card">
          <div className="brand-row">
            <MascotAvatar size="sm" src={pantryMascot} />
            <span>
              <strong>Mosaic AI Tip</strong> <Badge variant="green">Suggest</Badge>
              <br />
              <span className="small muted">Based on what is in your kitchen.</span>
            </span>
          </div>
          <p className="small">You already have: spinach, eggs and soy sauce.</p>
          <Card variant="soft">
            <span className="eyebrow">Generate</span>
            <h3 style={{ margin: 0 }}>Vegetable Fried Rice</h3>
            <p className="small muted">~20 min - saves £4.20</p>
          </Card>
        </Card>

        <div className="footer-actions">
          <Button icon={<Plus size={17} />} onClick={() => setIsAddModalOpen(true)} variant="secondary">
            Add Item
          </Button>
          <Button icon={<Camera size={17} />} onClick={() => navigate("/ai-vision")}>
            Scan Ingredients
          </Button>
        </div>
      </div>
      <BottomNav />

      {isAddModalOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-ingredient-title">
          <Card className="modal-panel">
            <div className="premium-strip">
              <h2 id="add-ingredient-title" style={{ margin: 0 }}>
                Add Ingredient
              </h2>
              <button className="icon-only" onClick={() => setIsAddModalOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <Input label="Ingredient" placeholder="Spinach, rice, tofu..." />
              <Input label="Quantity" placeholder="200g, 1 pack, 6 units..." />
              <Input label="Expiry" placeholder="In 3 days" />
              <Button fullWidth icon={<Plus size={17} />} onClick={addIngredient}>
                Add Ingredient
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
