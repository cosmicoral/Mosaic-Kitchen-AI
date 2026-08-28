import { Camera, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
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
import { usePantry } from "../hooks/usePantry";
import { daysUntil, expiryTone, formatAmount, formatExpiry } from "../lib/pantryFormat";
import { PANTRY_CATEGORIES, type PantryCategory, type PantryItem } from "../types";

const CATEGORY_LABELS: Record<PantryCategory, string> = {
  vegetables: "Vegetables",
  protein: "Protein",
  grains: "Grains",
  condiments: "Condiments",
  frozen: "Frozen",
  dairy: "Dairy",
  other: "Other",
};

const EXPIRING_WINDOW_DAYS = 7;

export function PantryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { items, status, error, refresh, addItem, removeItem } = usePantry();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAllExpiring, setShowAllExpiring] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<PantryCategory>("vegetables");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Derived from `items`, so it can never disagree with the list on screen.
  // useMemo because grouping and sorting on every keystroke in the modal would
  // be wasted work.
  const expiringItems = useMemo(
    () =>
      items.filter(
        (item) => item.expires_on && daysUntil(item.expires_on) <= EXPIRING_WINDOW_DAYS
      ),
    [items]
  );

  // The API returns one flat list; the UI groups it. Doing the grouping here
  // rather than adding a second endpoint keeps the two views guaranteed
  // consistent.
  const grouped = useMemo(() => {
    const buckets = new Map<PantryCategory, PantryItem[]>();
    for (const item of items) {
      const bucket = buckets.get(item.category) ?? [];
      bucket.push(item);
      buckets.set(item.category, bucket);
    }
    return PANTRY_CATEGORIES.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      items: buckets.get(key) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [items]);

  const visibleExpiring = showAllExpiring ? expiringItems : expiringItems.slice(0, 3);

  function resetForm() {
    setName("");
    setCategory("vegetables");
    setQuantity("");
    setUnit("");
    setExpiresOn("");
    setFormError(null);
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await addItem({
        name,
        category,
        // An empty field means "not specified", which is null — not 0, which
        // the server would reject as a non-positive quantity.
        quantity: quantity.trim() === "" ? null : Number(quantity),
        unit: unit.trim() === "" ? null : unit.trim(),
        expires_on: expiresOn === "" ? null : expiresOn,
      });
      setIsAddModalOpen(false);
      resetForm();
      showToast(`${name} added to your pantry`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not add the item");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(item: PantryItem) {
    try {
      await removeItem(item.id);
      showToast(`${item.name} removed`);
    } catch {
      showToast("Could not remove that item");
    }
  }

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <TopNav
          onRightAction={() => void refresh()}
          rightLabel="Refresh"
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
              <h2 style={{ margin: 0 }}>
                {items.length} {items.length === 1 ? "ingredient" : "ingredients"} stored
              </h2>
              <div className="choice-grid" style={{ marginTop: 12 }}>
                <Badge variant="dark">{grouped.length} categories</Badge>
                <Badge variant="dark">{expiringItems.length} expiring soon</Badge>
              </div>
            </span>
          </div>
        </Card>

        {status === "loading" ? (
          <Card className="section">
            <div className="brand-row">
              <Loader2 size={18} />
              <span className="small muted">Loading your pantry…</span>
            </div>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card className="section">
            <strong>Could not load your pantry</strong>
            <p className="small muted">{error}</p>
            <Button icon={<RefreshCw size={16} />} onClick={() => void refresh()} variant="secondary">
              Try again
            </Button>
          </Card>
        ) : null}

        {status === "ready" && items.length === 0 ? (
          <Card className="section">
            <div className="brand-row">
              <MascotAvatar size="sm" src={pantryMascot} />
              <span>
                <strong>Your pantry is empty</strong>
                <br />
                <span className="small muted">
                  Add what you already have and Mosaic can plan around it.
                </span>
              </span>
            </div>
            <Button
              fullWidth
              icon={<Plus size={17} />}
              onClick={() => setIsAddModalOpen(true)}
              style={{ marginTop: 14 }}
            >
              Add your first ingredient
            </Button>
          </Card>
        ) : null}

        {expiringItems.length > 0 ? (
          <>
            <div className="section-title">
              <h2>Expiring Soon</h2>
              {expiringItems.length > 3 ? (
                <button
                  className="top-nav__right"
                  onClick={() => setShowAllExpiring((value) => !value)}
                  type="button"
                >
                  {showAllExpiring ? "Show Less" : "See All"}
                </button>
              ) : null}
            </div>

            <section className="form-grid">
              {visibleExpiring.map((item) => (
                <Card className="alert-choice" key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <br />
                    <Badge variant={expiryTone(item.expires_on)}>
                      {formatExpiry(item.expires_on)}
                    </Badge>
                  </span>
                  <Button onClick={() => navigate("/expiry-alert")} variant="primary">
                    Use Fresh
                  </Button>
                </Card>
              ))}
            </section>
          </>
        ) : null}

        {grouped.length > 0 ? (
          <>
            <div className="section-title">
              <h2>Pantry Categories</h2>
              <button
                className="top-nav__right"
                onClick={() => setIsAddModalOpen(true)}
                type="button"
              >
                Add Item
              </button>
            </div>

            <section className="form-grid">
              {grouped.map((group) => (
                <Card className="category-card" key={group.key}>
                  <div className="category-head">
                    <span className="brand-row">
                      <span>
                        <strong>{group.label}</strong>
                        <br />
                        <span className="small muted">
                          {group.items.length} {group.items.length === 1 ? "item" : "items"}
                        </span>
                      </span>
                    </span>
                  </div>

                  {group.items.map((item) => (
                    <div className="check-item" key={item.id}>
                      <span>
                        <strong>{item.name}</strong>
                        <br />
                        <span className="small muted">
                          {formatAmount(item) || "No quantity set"}
                        </span>
                      </span>
                      <Badge variant={expiryTone(item.expires_on)}>
                        {formatExpiry(item.expires_on)}
                      </Badge>
                      <button
                        aria-label={`Remove ${item.name}`}
                        className="icon-only"
                        onClick={() => void handleRemove(item)}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </Card>
              ))}
            </section>
          </>
        ) : null}

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
              <button
                className="icon-only"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd}>
              <div className="form-grid" style={{ marginTop: 16 }}>
                <Input
                  label="Ingredient"
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Spinach, rice, tofu..."
                  required
                  value={name}
                />

                <div className="input-field">
                  <label>Category</label>
                  <div className="choice-grid">
                    {PANTRY_CATEGORIES.map((key) => (
                      <button
                        className={`choice-pill${key === category ? " is-selected" : ""}`}
                        key={key}
                        onClick={() => setCategory(key)}
                        type="button"
                      >
                        {CATEGORY_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Quantity (optional)"
                  min="0"
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="200"
                  step="0.01"
                  type="number"
                  value={quantity}
                />
                <Input
                  label="Unit (optional)"
                  maxLength={20}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="g, ml, pack, units"
                  value={unit}
                />
                <Input
                  label="Expiry date (optional)"
                  onChange={(event) => setExpiresOn(event.target.value)}
                  type="date"
                  value={expiresOn}
                />

                {formError ? (
                  <p className="small" role="alert" style={{ color: "var(--danger, #c0392b)" }}>
                    {formError}
                  </p>
                ) : null}

                <Button disabled={submitting} fullWidth icon={<Plus size={17} />} type="submit">
                  {submitting ? "Adding…" : "Add Ingredient"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </main>
  );
}