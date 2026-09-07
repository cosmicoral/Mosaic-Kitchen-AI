-- Up Migration

-- Repairs are translations of old rows that were labelled with the requested
-- locale but still contain wrong-language fields, or cached translations made
-- before all visible fields were covered. Track their cost separately so an
-- application bug does not consume the household's translation allowance.
ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_feature_valid;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_feature_valid
  CHECK (feature IN (
    'meal-plan', 'pantry-cook', 'plan-translate', 'plan-repair',
    'vision-scan', 'ingredient-gloss'
  ));

-- Down Migration

DELETE FROM ai_usage WHERE feature = 'plan-repair';

ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_feature_valid;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_feature_valid
  CHECK (feature IN (
    'meal-plan', 'pantry-cook', 'plan-translate',
    'vision-scan', 'ingredient-gloss'
  ));
