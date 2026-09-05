-- Up Migration

-- The CHECK list was written when there were two AI features. 'pantry-cook'
-- was added in code without being added here, so every pantry cook made its
-- OpenAI call, came back with a plan, and then failed on the usage INSERT —
-- money spent, nothing saved, and a bare "Internal server error" on screen
-- because a Postgres error is not an AppError.
--
-- The constraint itself is worth keeping: it is what stops a typo in a feature
-- key from quietly splitting one quota into two that never reach their limit.
-- What it needed was to be part of adding a feature, not something to trip
-- over afterwards.
ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_feature_valid;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_feature_valid
  CHECK (feature IN ('meal-plan', 'pantry-cook', 'vision-scan'));

-- Down Migration

-- Rows have to go before the narrower constraint can be restored, otherwise
-- the ADD fails on its own validation scan.
DELETE FROM ai_usage WHERE feature = 'pantry-cook';

ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_feature_valid;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_feature_valid
  CHECK (feature IN ('meal-plan', 'vision-scan'));
