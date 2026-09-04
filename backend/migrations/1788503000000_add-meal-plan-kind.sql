-- Up Migration

-- 'weekly' is the plan the household set out to have; 'pantry' is two or three
-- dishes worked out from what is in the kitchen right now. They are stored in
-- the same table because they are the same shape and both feed the
-- do-not-repeat list, but they must be told apart: without this, asking "what
-- can I make with this cabbage" would replace someone's weekly plan on the
-- meal plan page.
ALTER TABLE meal_plans
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'weekly'
  CHECK (kind IN ('weekly', 'pantry'));

CREATE INDEX meal_plans_user_kind_created_idx
  ON meal_plans (user_id, kind, created_at DESC);

-- Down Migration

DROP INDEX meal_plans_user_kind_created_idx;
ALTER TABLE meal_plans DROP COLUMN kind;
