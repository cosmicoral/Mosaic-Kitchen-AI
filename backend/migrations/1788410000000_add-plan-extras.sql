-- Up Migration

-- Which non-meal items the household wants planned alongside the meals:
-- 'fruit', 'snack', 'dessert'. Empty means meals only, which stays the
-- default — nobody should be given a daily dessert they did not ask for.
ALTER TABLE user_profiles
  ADD COLUMN include_extras TEXT[] NOT NULL DEFAULT '{}';

-- How often those extras should appear. Separate from which kinds are wanted,
-- because "fruit, but not every day" and "fruit every day" are different
-- answers to different questions.
ALTER TABLE user_profiles
  ADD COLUMN extras_frequency TEXT NOT NULL DEFAULT 'some'
  CHECK (extras_frequency IN ('few', 'some', 'plenty'));

-- Down Migration

ALTER TABLE user_profiles DROP COLUMN extras_frequency;
ALTER TABLE user_profiles DROP COLUMN include_extras;
