import { Check, ChevronDown, Edit, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "../components/navigation/BottomNav";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";
import { iconMap, shoppingCategories } from "../data/mockData";

export function ShoppingListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const toggle = (name: string) => {
    setCheckedItems((items) =>
      items.includes(name) ? items.filter((item) => item !== name) : [...items, name],
    );
  };

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <TopNav
          fallbackBackTo="/dashboard"
          onRightAction={() => setIsEditing((editing) => !editing)}
          rightLabel={isEditing ? "Done" : "Edit"}
          title="Shopping List"
        />

        <section className="page-heading">
          <h1>Your Shopping List</h1>
          <p>Week of Jun 9 - 14 items</p>
        </section>

        <Card className="shopping-total">
          <span>
            <span className="eyebrow">Estimated total</span>
            <strong>£25.10</strong>
            <span className="small muted">14 items - {checkedItems.length} in cart</span>
          </span>
          <span className="progress-ring">{Math.round((checkedItems.length / 14) * 100)}%</span>
        </Card>

        <div className="section-title">
          <h2>Categories</h2>
        </div>

        {isEditing ? <div className="edit-banner">Edit mode is on. Tap items to update the mock cart state.</div> : null}

        <section className="form-grid">
          {shoppingCategories.map((category, index) => (
            <Card className="category-card" key={category.name}>
              <div className="category-head">
                <span className="brand-row">
                  <span className="item-icon">{iconMap[category.icon]}</span>
                  <span>
                    <strong>{category.name}</strong>
                    <br />
                    <span className="small muted">
                      {category.progress} - {category.total}
                    </span>
                  </span>
                </span>
                <ChevronDown size={18} />
              </div>
              {index === 0
                ? category.items.map((item) => {
                    const isOn = checkedItems.includes(item.name);
                    return (
                      <button className="check-item" key={item.name} onClick={() => toggle(item.name)} type="button">
                        <span className={`check-circle${isOn ? " is-on" : ""}`}>
                          {isOn ? <Check size={14} /> : null}
                        </span>
                        <span>
                          <strong>{item.name}</strong>
                          <br />
                          <span className="small muted">{item.amount}</span>
                        </span>
                        <strong style={{ color: "var(--color-primary-strong)" }}>{item.price}</strong>
                      </button>
                    );
                  })
                : null}
            </Card>
          ))}
        </section>

        <Card className="section" variant="soft">
          <div className="brand-row">
            <MascotAvatar size="sm" />
            <span>
              <strong>Mosaic AI</strong> <Badge variant="green">Tip</Badge>
              <br />
              <span className="small muted">You already have these in your pantry.</span>
            </span>
          </div>
          <ul className="check-list" style={{ marginTop: 14 }}>
            {["Soy Sauce", "Jasmine Rice", "Eggs"].map((item) => (
              <li key={item}>
                <Check color="var(--color-primary-strong)" size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button fullWidth onClick={() => showToast("Pantry duplicates skipped")} variant="secondary">
            Skip these and save £6.20
          </Button>
        </Card>

        <div className="footer-actions">
          <Button icon={<Plus size={17} />} onClick={() => navigate("/pantry")} variant="secondary">
            Add to Pantry
          </Button>
          <Button icon={<ShoppingCart size={17} />} onClick={() => showToast("Shopping list exported")}>
            Export Shopping List
          </Button>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
