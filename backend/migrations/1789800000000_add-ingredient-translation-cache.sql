-- Up Migration

-- A gloss for ingredient names the curated lexicon does not know.
--
-- The pantry and the shopping list hold rows the user owns, so the server does
-- not rewrite them: a name typed as 云南酸菜 stays 云南酸菜. But a reader who
-- has chosen English still has to know what it is, and the lexicon's long tail
-- — regional products, brand-ish names, things somebody typed themselves —
-- will never be fully curated.
--
-- So the name is shown as stored, with a translation underneath. Not a
-- replacement: an annotation.
--
-- Cached globally rather than per user because the answer does not vary by
-- who asked. 云南酸菜 is "Yunnan pickled greens" for everyone, and paying for
-- that once rather than once per household is the whole reason this table
-- exists. Ingredient names are not personal data in the way an email is; a
-- name somebody invented is still just a name for a vegetable.
CREATE TABLE ingredient_glosses (
  -- Lowercased and trimmed at write time, matching how the lexicon normalises,
  -- so 'Sea Bream' and 'sea bream ' do not become two paid-for rows.
  source_text  TEXT NOT NULL,
  target_locale TEXT NOT NULL CHECK (target_locale IN ('en', 'zh')),

  gloss        TEXT NOT NULL,

  -- Which model produced it, so a bad batch can be found and deleted rather
  -- than living forever because nothing records where it came from.
  model        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (source_text, target_locale)
);

-- Down Migration

DROP TABLE ingredient_glosses;
