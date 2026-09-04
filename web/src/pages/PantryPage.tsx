import { Camera, Loader2, Plus, RefreshCw, Trash2, X, Check, ChefHat } from "lucide-react";
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
import { MAX_SELECTION, usePantryCook } from "../hooks/usePantryCook";
import { daysUntil, expiryTone, formatAmount, formatExpiryForLocale } from "../lib/pantryFormat";
import { PANTRY_CATEGORIES, type PantryCategory, type PantryItem } from "../types";
import { SkeletonList } from "../components/ui/Skeleton";
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

const EXPIRING_WINDOW_DAYS = 7;

export function PantryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { locale, t } = useLocale();
  const { items, status, error, refresh, addItem, removeItem, removeItems } = usePantry();
  const cook = usePantryCook();
  const [picking, setPicking] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Confirmed, unlike the single-row delete. One row is a small mistake with
  // an obvious cause; twenty rows disappearing at once is not something a
  // person can reconstruct from memory, and there is no undo here.
  async function handleBulkDelete() {
    const count = cook.selected.length;
    if (count === 0) return;
    if (!window.confirm(t("Delete these ingredients from your pantry?"))) return;

    setDeleting(true);
    try {
      const { removed, failed } = await removeItems(cook.selected);
      cook.clear();
      setPicking(false);
      showToast(
        failed > 0
          ? `${removed} ${t("removed")}, ${failed} ${t("could not be removed")}`
          : `${removed} ${t("removed")}`
      );
    } finally {
      setDeleting(false);
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
          <h1>{t("My Kitchen")}</h1>
          <p>{t("Track ingredients, reduce food waste and cook smarter.")}</p>
        </section>

        <Card variant="dark">
          <div className="pantry-overview">
            <span>
              <p className="eyebrow" style={{ color: "#bfea73" }}>
                {t("Pantry overview")}
              </p>
              <h2 style={{ margin: 0 }}>
                {items.length} {t("ingredients")} {t("stored")}
              </h2>
              <div className="choice-grid" style={{ marginTop: 12 }}>
                <Badge variant="dark">{grouped.length} {t("categories")}</Badge>
                <Badge variant="dark">{expiringItems.length} {t("expiring soon")}</Badge>
              </div>
            </span>
          </div>
        </Card>

        {status === "loading" ? (
          <SkeletonList count={3} label={t("Loading your pantry…")} />
        ) : null}

        {status === "error" ? (
          <Card className="section">
            <strong>{t("Could not load your pantry")}</strong>
            <p className="small muted">{error}</p>
            <Button icon={<RefreshCw size={16} />} onClick={() => void refresh()} variant="secondary">
              {t("Try again")}
            </Button>
          </Card>
        ) : null}

        {status === "ready" && items.length === 0 ? (
          <Card className="section">
            <div className="brand-row">
              <MascotAvatar size="sm" src={pantryMascot} />
              <span>
                <strong>{t("Your pantry is empty")}</strong>
                <br />
                <span className="small muted">
                  {t("Add what you already have and Mosaic can plan around it.")}
                </span>
              </span>
            </div>
            <Button
              fullWidth
              icon={<Plus size={17} />}
              onClick={() => setIsAddModalOpen(true)}
              style={{ marginTop: 14 }}
            >
              {t("Add your first ingredient")}
            </Button>
          </Card>
        ) : null}

        {expiringItems.length > 0 ? (
          <>
            <div className="section-title">
              <h2>{t("Expiring Soon")}</h2>
              {expiringItems.length > 3 ? (
                <button
                  className="top-nav__right"
                  onClick={() => setShowAllExpiring((value) => !value)}
                  type="button"
                >
                  {showAllExpiring ? t("Show Less") : t("See All")}
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
                      {formatExpiryForLocale(item.expires_on, locale)}
                    </Badge>
                  </span>
                  <Button onClick={() => navigate(`/expiry-alert?item=${item.id}`)} variant="primary">
                    {t("Use Fresh")}
                  </Button>
                </Card>
              ))}
            </section>
          </>
        ) : null}

        {grouped.length > 0 ? (
          <>
            <div className="section-title">
              <h2>{t("Pantry Categories")}</h2>
              <button
                className="top-nav__right"
                onClick={() => {
                  if (picking) cook.clear();
                  setPicking((current) => !current);
                }}
                type="button"
              >
                {picking ? t("Cancel") : t("Select")}
              </button>
            </div>

            {/* Only rendered in picking mode. A tick box on every row all the
                time would make the ordinary job — seeing what you have —
                busier for the sake of a thing done occasionally. */}
            {picking ? (
              <Card variant="soft">
                <div className="premium-strip">
                  <strong>
                    {cook.selected.length} {t("selected")}
                  </strong>
                  <button
                    className="top-nav__right"
                    onClick={() =>
                      cook.selectMany(
                        cook.selected.length === items.length
                          ? []
                          : items.map((item) => item.id)
                      )
                    }
                    type="button"
                  >
                    {cook.selected.length === items.length
                      ? t("Select none")
                      : t("Select all")}
                  </button>
                </div>
                <p className="small muted" style={{ marginTop: 4 }}>
                  {t("Cook with them, or clear them out of your pantry.")}
                </p>
                {cook.selected.length > MAX_SELECTION ? (
                  <p className="tiny muted">
                    {t("Cooking works with up to")} {MAX_SELECTION} {t("ingredients — deleting has no limit.")}
                  </p>
                ) : null}
              </Card>
            ) : null}

            <section className="form-grid mk-stagger">
              {grouped.map((group) => (
                <Card className="category-card" key={group.key}>
                  <div className="category-head">
                    <span className="brand-row">
                      <span>
                        <strong>{t(group.label)}</strong>
                        <br />
                        <span className="small muted">
                          {group.items.length} {t("items")}
                        </span>
                      </span>
                    </span>
                  </div>

                  {group.items.map((item) => (
                    <div className="check-item" key={item.id}>
                      {picking ? (
                        <button
                          aria-label={`Select ${item.name}`}
                          className={`check-circle${cook.selected.includes(item.id) ? " is-on" : ""}`}
                          onClick={() => cook.toggle(item.id)}
                          type="button"
                        >
                          {cook.selected.includes(item.id) ? <Check size={14} /> : null}
                        </button>
                      ) : null}
                      <span>
                        <strong>{item.name}</strong>
                        <br />
                        <span className="small muted">
                          {formatAmount(item) || t("No quantity set")}
                        </span>
                      </span>
                      <Badge variant={expiryTone(item.expires_on)}>
                        {formatExpiryForLocale(item.expires_on, locale)}
                      </Badge>
                      {/* Delete is hidden while picking: the two buttons would
                          sit next to each other doing opposite things, and one
                          of them is not undoable. */}
                      {picking ? null : (
                      <button
                        aria-label={`Remove ${item.name}`}
                        className="icon-only"
                        onClick={() => void handleRemove(item)}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                      )}
                    </div>
                  ))}
                </Card>
              ))}
            </section>
          </>
        ) : null}

        {cook.error ? (
          <Card className="section">
            <strong>{t("Could not suggest dishes")}</strong>
            <p className="small muted">{cook.error.message}</p>
            {cook.error.code === "QUOTA_EXCEEDED" ? (
              <Button fullWidth onClick={() => navigate("/pricing")} variant="premium">
                {t("See plans")}
              </Button>
            ) : null}
          </Card>
        ) : null}

        {cook.result ? (
          <Card className="section" variant="soft">
            <div className="premium-strip">
              <strong>{t("Cook these")}</strong>
              <button className="top-nav__right" onClick={cook.clear} type="button">
                {t("Clear")}
              </button>
            </div>
            <div className="form-grid" style={{ marginTop: 12 }}>
              {cook.result.plan.days
                .flatMap((day) => day.meals)
                .map((meal) => (
                  <Card key={meal.name}>
                    <strong>{meal.name}</strong>
                    {meal.native_name ? (
                      <>
                        {" "}
                        <span className="small muted">{meal.native_name}</span>
                      </>
                    ) : null}
                    <br />
                    <span className="small muted">
                      {meal.minutes} {t("minutes")} · {meal.region ?? meal.cuisine}
                    </span>
                    <ul className="check-list" style={{ marginTop: 10 }}>
                      {meal.steps.map((step, index) => (
                        <li key={step}>
                          <span className="small">
                            {index + 1}. {step}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
            </div>
          </Card>
        ) : null}

        <div className="footer-actions">
          {picking ? (
            <>
              <Button
                disabled={cook.selected.length === 0 || deleting}
                icon={<Trash2 size={17} />}
                onClick={() => void handleBulkDelete()}
                variant="secondary"
              >
                {deleting ? t("Deleting…") : `${t("Delete")} ${cook.selected.length}`}
              </Button>
              <Button
                disabled={
                  cook.selected.length === 0 ||
                  cook.selected.length > MAX_SELECTION ||
                  cook.cooking
                }
                icon={<ChefHat size={17} />}
                onClick={async () => {
                  const plan = await cook.cook();
                  if (plan) setPicking(false);
                }}
              >
                {cook.cooking
                  ? t("Working it out…")
                  : `${t("Cook with")} ${cook.selected.length}`}
              </Button>
            </>
          ) : (
            <>
              <Button icon={<Plus size={17} />} onClick={() => setIsAddModalOpen(true)} variant="secondary">
                {t("Add Item")}
              </Button>
              <Button icon={<Camera size={17} />} onClick={() => navigate("/ai-vision")}>
                {t("Scan Ingredients")}
              </Button>
            </>
          )}
        </div>
      </div>
      <BottomNav />

      {isAddModalOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-ingredient-title">
          <Card className="modal-panel">
            <div className="premium-strip">
              <h2 id="add-ingredient-title" style={{ margin: 0 }}>
                {t("Add Ingredient")}
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
                  label={t("Ingredient")}
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Spinach, rice, tofu..."
                  required
                  value={name}
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

                <Input
                  label={t("Quantity (optional)")}
                  min="0"
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="200"
                  step="0.01"
                  type="number"
                  value={quantity}
                />
                <Input
                  label={t("Unit (optional)")}
                  maxLength={20}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="g, ml, pack, units"
                  value={unit}
                />
                <Input
                  label={t("Expiry date (optional)")}
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
                  {submitting ? t("Adding…") : t("Add Ingredient")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
