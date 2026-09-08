-- Up Migration

-- Two changes, one reason: this is the migration that makes the profile
-- lawful to hold.

-- 1. Postcode goes.
--
-- It was collected from the first version and read by nothing — not a prompt,
-- not a query, not a feature. UK GDPR Article 5(1)(c) allows collecting only
-- what a stated purpose needs, and "we might use it later" is not a purpose.
--
-- A UK postcode covers a few dozen households. Beside the household
-- composition, the dietary restrictions and the weekly budget already in this
-- table, it is the field that turns a sensitive profile into an identifiable
-- one. Dropping it costs no feature, because no feature ever read it.
--
-- Not replaced with a city. That would be the same mistake one size smaller:
-- still personal data, still no purpose. When regional grocery availability
-- is actually built, location can be asked for then, for that reason, and the
-- privacy notice can say what it is for.
ALTER TABLE user_profiles DROP COLUMN postcode;

-- 2. Explicit consent for special category data.
--
-- avoid_ingredients holds allergies and intolerances, which are health data.
-- low_salt, low_sugar and nutrition_focus are health data. Cuisines combined
-- with a religious exclusion reveal religious belief. All three are Article 9
-- special category data, and Article 9 prohibits processing them unless an
-- exemption applies. The only realistic one here is 9(2)(a): explicit consent.
--
-- Stored as a timestamp rather than a boolean, because consent that cannot be
-- evidenced is consent you do not have. A `true` says nothing about when it was
-- given or under which version of the notice; a timestamp does, and NULL is
-- unambiguously "never given" rather than "defaulted to false by a migration".
--
-- Nullable, and deliberately not backfilled. Existing rows have not consented —
-- nobody was ever asked — and writing now() into them would be manufacturing a
-- record of something that did not happen. They will be asked on next edit.
ALTER TABLE user_profiles ADD COLUMN data_consent_at TIMESTAMPTZ;

-- The wording in force when it was given. A privacy notice gets revised, and
-- consent obtained under one version is not evidence of consent to a later one;
-- without this, a revision silently invalidates every record without saying so.
ALTER TABLE user_profiles ADD COLUMN data_consent_version TEXT;

COMMENT ON COLUMN user_profiles.data_consent_at IS
  'UK GDPR Art 9(2)(a) explicit consent to process dietary health and belief data. NULL means never given.';

-- Down Migration

ALTER TABLE user_profiles DROP COLUMN data_consent_version;
ALTER TABLE user_profiles DROP COLUMN data_consent_at;

-- Restored as nullable with no backfill. The values are gone and inventing
-- them is not an option; a rollback returns the shape, not the data.
ALTER TABLE user_profiles ADD COLUMN postcode TEXT;
