-- Up Migration

-- Second time this constraint has needed widening, and the second time it was
-- the test rather than production that said so — which is the whole return on
-- having written tests/aiUsageFeatures.test.ts after the 'pantry-cook'
-- incident. That one was found by a user seeing "Internal server error" after
-- the model call had already been paid for. This one was found before the code
-- shipped, by a test that reads the constraint out of these files and compares
-- it to the keys in src.
--
-- 'ingredient-gloss' is the annotation shown under an ingredient name the
-- interface cannot translate itself. It was calling the model and recording
-- nothing, so it appeared in no quota and in no spend total: the one kind of
-- cost that grows without ever showing up on a graph.
ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_feature_valid;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_feature_valid
  CHECK (feature IN (
    'meal-plan',
    'pantry-cook',
    'plan-translate',
    'vision-scan',
    'ingredient-gloss'
  ));

-- Down Migration

-- Rows first: ADD CONSTRAINT validates the existing table, so a single
-- 'ingredient-gloss' row left behind would make the rollback fail halfway.
DELETE FROM ai_usage WHERE feature = 'ingredient-gloss';

ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_feature_valid;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_feature_valid
  CHECK (feature IN ('meal-plan', 'pantry-cook', 'plan-translate', 'vision-scan'));
