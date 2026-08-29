-- Up Migration
CREATE TABLE meal_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  starts_on   DATE NOT NULL,

  -- The plan is a document: produced once, always read whole, never queried
  -- into and never partially updated. Splitting it across day/meal/ingredient
  -- tables would mean three JOINs to rebuild something we always want in one
  -- piece, and old plans would break every time the generated shape changes.
  plan        JSONB NOT NULL,

  -- What the plan was generated from, kept alongside it. Preferences change;
  -- without this snapshot there is no way to explain why an old plan looks the
  -- way it does.
  profile_snapshot JSONB NOT NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_plans_user_created ON meal_plans(user_id, created_at DESC);

-- Separate from meal_plans because quota and spend have to be counted across
-- every AI feature, not just this one — fridge scanning lands here too.
CREATE TABLE ai_usage (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  feature           TEXT NOT NULL,
  model             TEXT NOT NULL,

  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,

  -- Six decimal places: a single call can cost fractions of a penny, and
  -- rounding those away makes the monthly total meaningless.
  cost_usd          NUMERIC(12, 6) NOT NULL DEFAULT 0,

  succeeded         BOOLEAN NOT NULL DEFAULT true,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ai_usage_feature_valid
    CHECK (feature IN ('meal-plan', 'vision-scan')),
  CONSTRAINT ai_usage_tokens_non_negative
    CHECK (prompt_tokens >= 0 AND completion_tokens >= 0),
  CONSTRAINT ai_usage_cost_non_negative
    CHECK (cost_usd >= 0)
);

-- Quota is "how many calls this month", so the index has to serve a filter on
-- user + feature with a range on time.
CREATE INDEX idx_ai_usage_user_feature_created
  ON ai_usage(user_id, feature, created_at DESC);
-- Down Migration
DROP TABLE ai_usage;
DROP TABLE meal_plans;