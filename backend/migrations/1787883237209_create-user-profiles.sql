-- Up Migration

CREATE TABLE user_profiles (
  -- One profile per user, so user_id is the primary key. A separate id column
  -- would leave room for a second profile, which means nothing here.
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Split rather than a single count: each band changes the plan differently,
  -- not just the amount of food. Teenagers often eat more than adults;
  -- toddlers need mild, soft, choke-safe food.
  adults            SMALLINT NOT NULL DEFAULT 1,
  teenagers         SMALLINT NOT NULL DEFAULT 0,
  children          SMALLINT NOT NULL DEFAULT 0,  -- roughly 5-12
  toddlers          SMALLINT NOT NULL DEFAULT 0,  -- roughly 1-4

  -- Maintained by Postgres, so the total can never drift from its parts.
  household_size    SMALLINT GENERATED ALWAYS AS
                      (adults + teenagers + children + toddlers) STORED,

  meals_per_week    SMALLINT NOT NULL DEFAULT 7,
  weekly_budget     NUMERIC(8, 2),

  cuisines          TEXT[] NOT NULL DEFAULT '{}',
  avoid_ingredients TEXT[] NOT NULL DEFAULT '{}',
  priorities        TEXT[] NOT NULL DEFAULT '{}',
  cooking_style     TEXT,

  postcode          TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_profiles_adults_sane     CHECK (adults BETWEEN 0 AND 20),
  CONSTRAINT user_profiles_teenagers_sane  CHECK (teenagers BETWEEN 0 AND 20),
  CONSTRAINT user_profiles_children_sane   CHECK (children BETWEEN 0 AND 20),
  CONSTRAINT user_profiles_toddlers_sane   CHECK (toddlers BETWEEN 0 AND 20),

  -- Somebody has to be eating. Written out rather than referencing
  -- household_size, because a generated column cannot be used in a CHECK.
  CONSTRAINT user_profiles_household_not_empty
    CHECK (adults + teenagers + children + toddlers >= 1),

  CONSTRAINT user_profiles_meals_per_week_sane
    CHECK (meals_per_week BETWEEN 1 AND 21),
  CONSTRAINT user_profiles_budget_positive
    CHECK (weekly_budget IS NULL OR weekly_budget > 0),
  CONSTRAINT user_profiles_postcode_length
    CHECK (postcode IS NULL OR char_length(postcode) BETWEEN 5 AND 8)
);

-- Down Migration

DROP TABLE user_profiles;