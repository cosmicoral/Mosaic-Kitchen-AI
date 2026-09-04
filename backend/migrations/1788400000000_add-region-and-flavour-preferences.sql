-- Up Migration

-- Namespaced as 'cuisine:region' ('chinese:sichuan') rather than bare region
-- slugs, because "Northern" and "Central" mean different things depending on
-- which cuisine they hang off, and a bare list could not tell them apart.
ALTER TABLE user_profiles
  ADD COLUMN cuisine_regions TEXT[] NOT NULL DEFAULT '{}';

-- One axis rather than separate salt/sauce/spice knobs: 重口味 is about the
-- overall force of the seasoning, not any single ingredient.
ALTER TABLE user_profiles
  ADD COLUMN seasoning_intensity TEXT
  CHECK (seasoning_intensity IN ('light', 'balanced', 'bold'));

-- Taste dimensions the household actively wants more of. Kept separate from
-- intensity: someone can want bold food that is sour rather than salty.
ALTER TABLE user_profiles
  ADD COLUMN flavour_notes TEXT[] NOT NULL DEFAULT '{}';

-- Deliberately not the low end of a three-point scale. These two are usually
-- health requirements — blood pressure, diabetes — rather than taste, and the
-- opposite setting is one no product should offer as an aspiration. There is
-- no "high salt" flag because the model's default is already a normal amount.
ALTER TABLE user_profiles
  ADD COLUMN low_salt BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE user_profiles
  ADD COLUMN low_sugar BOOLEAN NOT NULL DEFAULT false;

-- Down Migration

ALTER TABLE user_profiles DROP COLUMN low_sugar;
ALTER TABLE user_profiles DROP COLUMN low_salt;
ALTER TABLE user_profiles DROP COLUMN flavour_notes;
ALTER TABLE user_profiles DROP COLUMN seasoning_intensity;
ALTER TABLE user_profiles DROP COLUMN cuisine_regions;
