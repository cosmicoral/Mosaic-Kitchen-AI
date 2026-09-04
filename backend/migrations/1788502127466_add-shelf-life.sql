-- Up Migration

-- Which kind of date this class carries. The UK distinction is not cosmetic:
-- a use-by date is a safety limit and a best-before date is a quality note,
-- and the FSA spends real effort telling people not to bin food that is
-- merely past its best. Collapsing the two into one number is how a
-- waste-reduction app ends up causing waste.
CREATE TYPE date_kind AS ENUM ('use_by', 'best_before');

CREATE TABLE shelf_life_classes (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  date_kind    date_kind NOT NULL,

  -- Days from purchase, per storage location. NULL means the class does not
  -- sensibly live there — you do not freeze fresh salad leaves.
  fridge_days  SMALLINT CHECK (fridge_days > 0),
  freezer_days SMALLINT CHECK (freezer_days > 0),
  pantry_days  SMALLINT CHECK (pantry_days > 0),

  -- Where this number came from, so a figure can be defended or corrected
  -- later rather than being an anonymous constant.
  source       TEXT NOT NULL,

  -- Shown on the alert. Only populated where the handling actually matters.
  note         TEXT,

  CONSTRAINT shelf_life_has_somewhere_to_live
    CHECK (fridge_days IS NOT NULL OR freezer_days IS NOT NULL OR pantry_days IS NOT NULL)
);

-- Which class a pantry item was matched to, and how confident that was.
-- Stored on the item so the estimate can be explained ("we treated this as
-- oily fish") and so a re-run of the classifier is never needed to render
-- the pantry.
ALTER TABLE pantry_items
  ADD COLUMN shelf_life_class TEXT REFERENCES shelf_life_classes(id) ON DELETE SET NULL;

-- true when the date came from us rather than from the user. An estimate is
-- rendered differently and, for best-before classes, never raises an alarm.
ALTER TABLE pantry_items
  ADD COLUMN expiry_is_estimated BOOLEAN NOT NULL DEFAULT false;

-- Seed data. Deliberately hand-written rather than generated: these numbers
-- are health information, and a model inventing them is exactly the failure
-- this table exists to prevent. Figures follow UK Food Standards Agency and
-- NHS domestic storage guidance; anything uncertain is left out rather than
-- guessed at.
INSERT INTO shelf_life_classes
  (id, label, date_kind, fridge_days, freezer_days, pantry_days, source, note)
VALUES
  -- Use-by: getting these wrong makes someone ill.
  ('raw_poultry', 'Raw poultry', 'use_by', 2, 270, NULL, 'FSA', 'Freeze on the day of purchase if it will not be cooked within two days.'),
  ('raw_red_meat', 'Raw beef, lamb or pork', 'use_by', 3, 270, NULL, 'FSA', NULL),
  ('raw_mince', 'Raw mince', 'use_by', 2, 120, NULL, 'FSA', 'Mince spoils faster than a whole cut of the same meat.'),
  ('raw_offal', 'Offal', 'use_by', 2, 90, NULL, 'FSA', NULL),
  ('white_fish', 'White fish', 'use_by', 2, 180, NULL, 'FSA', NULL),
  ('oily_fish', 'Oily fish', 'use_by', 2, 90, NULL, 'FSA', 'Oily fish keeps less well frozen than white fish.'),
  ('shellfish', 'Shellfish and prawns', 'use_by', 1, 90, NULL, 'FSA', NULL),
  ('cooked_leftovers', 'Cooked leftovers', 'use_by', 2, 90, NULL, 'FSA', 'Cool within two hours, then refrigerate. Reheat once, until steaming.'),
  ('cooked_rice', 'Cooked rice or pasta', 'use_by', 1, 30, NULL, 'FSA', 'Cool quickly and refrigerate within an hour. Reheat once only.'),
  ('fresh_milk', 'Fresh milk', 'use_by', 5, 30, NULL, 'FSA', NULL),
  ('soft_cheese', 'Soft cheese', 'use_by', 7, NULL, NULL, 'FSA', NULL),
  ('fresh_tofu', 'Fresh tofu', 'use_by', 4, 90, NULL, 'FSA', 'Once opened, keep submerged in water and change it daily.'),
  ('ready_salad', 'Prepared salad leaves', 'use_by', 3, NULL, NULL, 'FSA', NULL),
  ('fresh_juice', 'Fresh juice', 'use_by', 4, 90, NULL, 'FSA', NULL),
  ('deli_meat', 'Sliced cooked meat', 'use_by', 3, 60, NULL, 'FSA', NULL),

  -- Best-before: past the date these are a quality question, not a safety
  -- one. The days are a sensible middle, not a floor, because shortening
  -- them here would push people to throw away food that is perfectly good.
  ('leafy_greens', 'Leafy greens', 'best_before', 5, NULL, NULL, 'WRAP', 'Limp is not off. Revive in cold water, or use in soup or a stir-fry.'),
  ('brassica', 'Broccoli, cabbage and cauliflower', 'best_before', 10, 240, NULL, 'WRAP', NULL),
  ('root_veg', 'Root vegetables', 'best_before', 21, 240, 14, 'WRAP', 'Keep somewhere cool and dark; the fridge is not essential.'),
  ('alliums', 'Onions, garlic and shallots', 'best_before', NULL, NULL, 30, 'WRAP', 'Store dry and out of the light, not in the fridge.'),
  ('spring_onions', 'Spring onions and leeks', 'best_before', 10, 180, NULL, 'WRAP', NULL),
  ('soft_fruit', 'Berries and soft fruit', 'best_before', 4, 240, NULL, 'WRAP', 'Freeze anything you will not finish; it is ideal for cooking later.'),
  ('hard_fruit', 'Apples, pears and citrus', 'best_before', 21, NULL, 7, 'WRAP', NULL),
  ('bananas', 'Bananas', 'best_before', NULL, 90, 6, 'WRAP', 'Do not refrigerate. Freeze overripe ones for baking.'),
  ('tomatoes', 'Tomatoes and peppers', 'best_before', 10, 240, 5, 'WRAP', 'Flavour is better out of the fridge.'),
  ('mushrooms', 'Mushrooms', 'best_before', 6, 90, NULL, 'WRAP', 'Store in paper, never sealed plastic.'),
  ('fresh_herbs', 'Fresh herbs', 'best_before', 7, 180, NULL, 'WRAP', 'Freeze chopped in oil if they are going over.'),
  ('hard_cheese', 'Hard cheese', 'best_before', 28, 90, NULL, 'FSA', 'Surface mould can be cut away from a hard cheese.'),
  ('butter', 'Butter', 'best_before', 30, 270, NULL, 'FSA', NULL),
  ('eggs', 'Eggs', 'best_before', 21, NULL, NULL, 'FSA', 'Fresh eggs sink in water; a floater is past it.'),
  ('bread', 'Bread', 'best_before', NULL, 90, 4, 'WRAP', 'Freezing bread on the day you buy it is the single easiest saving.'),
  ('dried_grains', 'Rice, pasta and dried grains', 'best_before', NULL, NULL, 540, 'WRAP', NULL),
  ('dried_pulses', 'Dried pulses', 'best_before', NULL, NULL, 540, 'WRAP', NULL),
  ('dried_goods', 'Dried mushrooms, fungus and seaweed', 'best_before', NULL, NULL, 365, 'WRAP', NULL),
  ('nuts_seeds', 'Nuts and seeds', 'best_before', 180, 365, 90, 'WRAP', 'They go rancid rather than mouldy; refrigerate to slow it.'),
  ('flour', 'Flour', 'best_before', NULL, NULL, 240, 'WRAP', NULL),
  ('tinned', 'Tinned and jarred goods, unopened', 'best_before', NULL, NULL, 730, 'WRAP', NULL),
  ('condiments_open', 'Opened sauces and condiments', 'best_before', 180, NULL, NULL, 'FSA', 'Check the label; many keep at room temperature until opened.'),
  ('oils', 'Cooking oils', 'best_before', NULL, NULL, 365, 'WRAP', NULL),
  ('spices', 'Dried spices and seasonings', 'best_before', NULL, NULL, 540, 'WRAP', 'Safe well beyond this; they simply lose their punch.'),
  ('fermented', 'Kimchi, pickles and fermented vegetables', 'best_before', 180, NULL, NULL, 'WRAP', 'Fermenting further is not spoiling; the taste sharpens.'),
  ('frozen_goods', 'Frozen food', 'best_before', NULL, 180, NULL, 'FSA', NULL);

CREATE INDEX pantry_items_shelf_life_class_idx ON pantry_items (shelf_life_class);

-- Down Migration

DROP INDEX pantry_items_shelf_life_class_idx;
ALTER TABLE pantry_items DROP COLUMN expiry_is_estimated;
ALTER TABLE pantry_items DROP COLUMN shelf_life_class;
DROP TABLE shelf_life_classes;
DROP TYPE date_kind;
