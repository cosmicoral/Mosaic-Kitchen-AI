-- Up Migration

-- What the household wants more of on the plate. Stored as ingredient
-- emphases rather than health goals: "favour good sources of iron" is a
-- statement about food, which this app can act on, whereas "increase your iron
-- intake" is dietary advice, which it is not qualified to give and has no
-- nutrient data to back.
ALTER TABLE user_profiles
  ADD COLUMN nutrition_focus TEXT[] NOT NULL DEFAULT '{}';

-- Down Migration

ALTER TABLE user_profiles DROP COLUMN nutrition_focus;
