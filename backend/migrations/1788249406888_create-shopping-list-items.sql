-- Up Migration

CREATE TABLE shopping_list_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- The plan this list was built from. Nullable so a user can keep adding
  -- their own items to a list whose plan was later deleted, and so manually
  -- added items are not tied to a plan at all.
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,

  name         TEXT NOT NULL,
  quantity     NUMERIC(10, 2),
  unit         TEXT,
  category     TEXT NOT NULL DEFAULT 'other',

  -- The whole reason this table exists: ticking things off is state that
  -- cannot be derived from the plan.
  is_checked   BOOLEAN NOT NULL DEFAULT false,

  -- Distinguishes what came from the plan from what the user typed, so a
  -- regenerated list can replace the former without discarding the latter.
  source       TEXT NOT NULL DEFAULT 'plan',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT shopping_list_items_name_length
    CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT shopping_list_items_quantity_positive
    CHECK (quantity IS NULL OR quantity > 0),
  CONSTRAINT shopping_list_items_source_valid
    CHECK (source IN ('plan', 'manual')),
  CONSTRAINT shopping_list_items_category_valid
    CHECK (category IN ('vegetables', 'protein', 'grains', 'condiments', 'frozen', 'dairy', 'other'))
);

CREATE INDEX idx_shopping_list_items_user ON shopping_list_items(user_id, created_at);
CREATE INDEX idx_shopping_list_items_plan ON shopping_list_items(meal_plan_id);

-- Down Migration

DROP TABLE shopping_list_items;