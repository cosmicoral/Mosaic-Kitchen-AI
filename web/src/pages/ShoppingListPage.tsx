import { Check, Loader2, Plus, RefreshCw, ShoppingCart, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { shoppingMascot } from "../assets/mascots";
import { BottomNav } from "../components/navigation/BottomNav";
import { TopNav } from "../components/navigation/TopNav";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MascotAvatar } from "../components/ui/MascotAvatar";
import { useToast } from "../components/ui/Toast";
import { useShoppingList } from "../hooks/useShoppingList";
import { PANTRY_CATEGORIES, type PantryCategory, type ShoppingListItem } from "../types";
import { useLocale } from "../context/LocaleContext";

const CATEGORY_LABELS: Record<PantryCategory, string> = {
  vegetables: "Vegetables",
  protein: "Protein",
  grains: "Grains",
  condiments: "Condiments",
  frozen: "Frozen",
  dairy: "Dairy",
  other: "Other",
};

function formatAmount(item: ShoppingListItem): string {
  if (!item.quantity) return item.unit ?? "";
  const amount = Number(item.quantity);
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  if (!item.unit) return rounded;
  return ["g", "kg", "ml", "l"].includes(item.unit.toLowerCase())
    ? `${rounded}${item.unit}`
    : `${rounded} ${item.unit}`;
}

export function ShoppingListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLocale();
  const {
    items, status, error, refresh,
    generate, generating, generateError,
    toggle, addItem, removeItem, clearChecked,
  } = useShoppingList();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<PantryCategory>("other");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkedCount = items.filter((item) => item.is_checked).length;
  const progress = items.length === 0 ? 0 : Math.round((checkedCount / items.length) * 100);

  // Grouped here rather than fetched pre-grouped, so the counts can never
  // disagree with the list rendered beside them.
  const grouped = useMemo(() => {
    const buckets = new Map<PantryCategory, ShoppingListItem[]>();
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

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await addItem({
        name,
        quantity: quantity.trim() === "" ? null : Number(quantity),
        unit: unit.trim() === "" ? null : unit.trim(),
        category,
      });
      setIsAdding(false);
      setName("");
      setQuantity("");
      setUnit("");
      setCategory("other");
      showToast("Added to your list");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not add that item");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="page page--nav">
        <TopNav fallbackBackTo="/dashboard" title="Shopping List" />

        <section className="page-heading">
          <h1>{t("Your Shopping List")}</h1>
          <p>{t("Built from your meal plan, minus what you already have.")}</p>
        </section>

        {status === "loading" ? (
          <Card>
            <div className="brand-row">
              <Loader2 size={18} />
              <span className="small muted">{t("Loading your list…")}</span>
            </div>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card>
            <strong>{t("Could not load your list")}</strong>
            <p className="small muted">{error}</p>
            <Button icon={<RefreshCw size={16} />} onClick={() => void refresh()} variant="secondary">
              {t("Try again")}
            </Button>
          </Card>
        ) : null}

        {generateError ? (
          <Card>
            <strong>{t("Could not build your list")}</strong>
            <p className="small muted">{generateError.message}</p>
            {generateError.code === "NOT_FOUND" ? (
              <Button fullWidth onClick={() => navigate("/meal-plan")}>
                {t("Generate a meal plan first")}
              </Button>
            ) : null}
          </Card>
        ) : null}

        {status === "ready" && items.length === 0 && !generating ? (
          <Card>
            <div className="brand-row">
              <MascotAvatar size="sm" src={shoppingMascot} />
              <span>
                <strong>{t("Nothing on the list yet")}</strong>
                <br />
                <span className="small muted">
                  {t("Build one from your meal plan, or add items yourself.")}
                </span>
              </span>
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <Button
                disabled={generating}
                fullWidth
                icon={<ShoppingCart size={17} />}
                onClick={() => void generate()}
              >
                {t("Build from my meal plan")}
              </Button>
              <Button fullWidth icon={<Plus size={17} />} onClick={() => setIsAdding(true)} variant="secondary">
                {t("Add an item")}
              </Button>
            </div>
          </Card>
        ) : null}

        {items.length > 0 ? (
          <>
            <Card className="shopping-total">
              <span>
                <span className="eyebrow">{t("Progress")}</span>
                <strong>
                  {checkedCount} of {items.length}
                </strong>
                <span className="small muted">
                  {items.length - checkedCount} {t("still to get")}
                </span>
              </span>
              <span className="progress-ring">{progress}%</span>
            </Card>

            <div className="section-title">
              <h2>{t("Categories")}</h2>
              <button
                className="top-nav__right"
                disabled={generating}
                onClick={() => void generate()}
                type="button"
              >
                {generating ? t("Rebuilding…") : t("Rebuild")}
              </button>
            </div>

            <section className="form-grid">
              {grouped.map((group) => (
                <Card className="category-card" key={group.key}>
                  <div className="category-head">
                    <span className="brand-row">
                      <span>
                        <strong>{t(group.label)}</strong>
                        <br />
                        <span className="small muted">
                          {group.items.filter((item) => item.is_checked).length} of{" "}
                          {group.items.length}
                        </span>
                      </span>
                    </span>
                  </div>

                  {group.items.map((item) => (
                    <div className="check-item" key={item.id}>
                      <button
                        aria-label={item.is_checked ? `Untick ${item.name}` : `Tick ${item.name}`}
                        className={`check-circle${item.is_checked ? " is-on" : ""}`}
                        onClick={() => void toggle(item).catch(() => showToast("Could not update"))}
                        type="button"
                      >
                        {item.is_checked ? <Check size={14} /> : null}
                      </button>
                      <span
                        style={{
                          // Ticked items stay visible but recede — a shopper
                          // needs to see what is already in the trolley.
                          opacity: item.is_checked ? 0.5 : 1,
                          textDecoration: item.is_checked ? "line-through" : "none",
                        }}
                      >
                        <strong>{item.name}</strong>
                        <br />
                        <span className="small muted">{formatAmount(item) || t("No amount set")}</span>
                      </span>
                      {item.source === "manual" ? <Badge variant="cream">{t("Added")}</Badge> : null}
                      <button
                        aria-label={`Remove ${item.name}`}
                        className="icon-only"
                        onClick={() =>
                          void removeItem(item.id).catch(() => showToast("Could not remove"))
                        }
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </Card>
              ))}
            </section>

            <div className="footer-actions">
              <Button icon={<Plus size={17} />} onClick={() => setIsAdding(true)} variant="secondary">
                {t("Add item")}
              </Button>
              <Button
                disabled={checkedCount === 0}
                icon={<Check size={17} />}
                onClick={async () => {
                  const removed = await clearChecked();
                  showToast(`${removed} item${removed === 1 ? "" : "s"} cleared`);
                }}
              >
                {t("Clear checked")} ({checkedCount})
              </Button>
            </div>
          </>
        ) : null}
      </div>
      <BottomNav />

      {isAdding ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
          <Card className="modal-panel">
            <div className="premium-strip">
              <h2 id="add-item-title" style={{ margin: 0 }}>
                {t("Add to list")}
              </h2>
              <button className="icon-only" onClick={() => setIsAdding(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd}>
              <div className="form-grid" style={{ marginTop: 16 }}>
                <Input
                  label={t("Item")}
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Bin bags, milk, washing up liquid..."
                  required
                  value={name}
                />
                <Input
                  label={t("Quantity (optional)")}
                  min="0"
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="2"
                  step="0.01"
                  type="number"
                  value={quantity}
                />
                <Input
                  label={t("Unit (optional)")}
                  maxLength={20}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="pack, kg, bottle"
                  value={unit}
                />

                <div className="input-field">
                  <label>{t("Category")}</label>
                  <div className="choice-grid">
                    {PANTRY_CATEGORIES.map((key) => (
                      <button
                        className={`choice-pill${key === category ? " is-selected" : ""}`}
                        key={key}
                        onClick={() => setCategory(key)}
                        type="button"
                      >
                        {t(CATEGORY_LABELS[key])}
                      </button>
                    ))}
                  </div>
                </div>

                {formError ? (
                  <p className="small" role="alert" style={{ color: "var(--danger, #c0392b)" }}>
                    {formError}
                  </p>
                ) : null}

                <Button disabled={submitting} fullWidth icon={<Plus size={17} />} type="submit">
                  {submitting ? t("Adding…") : t("Add item")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
