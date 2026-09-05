-- Up Migration

-- The language a plan was written in, recorded at generation time. Without it
-- there is no way to tell a Chinese plan being read in English from an English
-- plan being read in English, so nothing can decide whether a translation is
-- needed. Existing rows default to 'en'; that is a guess, but the only cost of
-- guessing wrong is one wasted translation of an old plan.
ALTER TABLE meal_plans
  ADD COLUMN locale TEXT NOT NULL DEFAULT 'en'
  CHECK (locale IN ('en', 'zh'));

-- A separate table rather than another JSONB column on meal_plans, because a
-- translation is not part of the plan: the plan is what the model produced and
-- what the household is being charged against, and it should not be rewritten
-- every time somebody flips a language toggle. Keeping them apart also means a
-- bad translation can be deleted without touching the plan.
CREATE TABLE meal_plan_translations (
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  locale       TEXT NOT NULL CHECK (locale IN ('en', 'zh')),

  -- The full plan document with only the user-facing strings replaced. Stored
  -- whole rather than as a string map so reads are one lookup and no merge
  -- step can go wrong at request time.
  plan         JSONB NOT NULL,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One translation per plan per language. This is what makes the cost
  -- one-off: the second reader of the same plan in the same language pays
  -- nothing.
  PRIMARY KEY (meal_plan_id, locale)
);

-- Widened for 'plan-translate'. Adding a feature key in code without adding it
-- here is what made every pantry cook fail after a paid model call; there is a
-- test now that compares the two, and it will fail if this is forgotten again.
ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_feature_valid;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_feature_valid
  CHECK (feature IN ('meal-plan', 'pantry-cook', 'plan-translate', 'vision-scan'));

-- Down Migration

DELETE FROM ai_usage WHERE feature = 'plan-translate';

ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_feature_valid;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_feature_valid
  CHECK (feature IN ('meal-plan', 'pantry-cook', 'vision-scan'));

DROP TABLE meal_plan_translations;

ALTER TABLE meal_plans DROP COLUMN locale;
