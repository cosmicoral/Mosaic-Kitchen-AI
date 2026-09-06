-- Up Migration

-- Translations now come in two sizes. 'card' is the summary, the tip and the
-- dish names — what a reader sees before opening anything. 'full' adds the
-- cooking steps and ingredient names, which are about two thirds of the tokens
-- in a plan and are mostly never read.
--
-- Existing rows are 'full': they were produced before the split, when the only
-- option was to translate everything.
ALTER TABLE meal_plan_translations
  ADD COLUMN scope TEXT NOT NULL DEFAULT 'full'
  CHECK (scope IN ('card', 'full'));

-- The primary key has to widen with it, or a card translation and a full one
-- for the same plan and language would collide and the cheaper one would
-- silently win.
ALTER TABLE meal_plan_translations
  DROP CONSTRAINT meal_plan_translations_pkey;

ALTER TABLE meal_plan_translations
  ADD PRIMARY KEY (meal_plan_id, locale, scope);

-- Down Migration

DELETE FROM meal_plan_translations WHERE scope = 'card';

ALTER TABLE meal_plan_translations
  DROP CONSTRAINT meal_plan_translations_pkey;

ALTER TABLE meal_plan_translations
  ADD PRIMARY KEY (meal_plan_id, locale);

ALTER TABLE meal_plan_translations DROP COLUMN scope;
