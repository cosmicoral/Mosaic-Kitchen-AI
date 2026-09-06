-- Up Migration

-- Schema only. Nothing is indexed, nothing is seeded, and no generation path
-- reads any of it. The point of landing it now is that the shape of the data
-- is the hard part, and it is easier to argue about an empty table than about
-- one somebody has already filled in the wrong shape.
--
-- Two problems live here, and they are NOT the same problem:
--
--   1. "Can this be bought?" — a fact. Deterministic, and answered by a table
--      lookup. Vector search would answer "here is something similar", which
--      is the wrong answer to a yes/no question about a shopping list.
--
--   2. "What should replace it, and what do people in Hunan actually cook?" —
--      a question of similarity and context. That is what retrieval is for.
--
-- Mixing them is how a planner ends up confidently telling a household in
-- Sheffield to buy fresh 香椿.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Grocery availability: deterministic
-- ---------------------------------------------------------------------------

-- Where a household shops. Region rather than country because availability is
-- not uniform within one: the same ingredient is a corner-shop staple in parts
-- of London and a two-hour drive elsewhere.
CREATE TABLE grocery_regions (
  id          TEXT PRIMARY KEY,          -- 'uk', 'uk-london', 'de'
  name        TEXT NOT NULL,
  -- Falls back to this region when an item is not listed here, so 'uk-london'
  -- inherits everything true of 'uk' without restating it.
  parent_id   TEXT REFERENCES grocery_regions(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Store *class*, not retailer. Tesco's range changes weekly and there is no
-- public price or stock API, so a per-retailer table would be stale the day
-- after it was written and would need a maintainer this project does not have.
-- "Is this a mainstream-supermarket item or a trip to the Asian grocer?" is
-- both stable and the question a shopper actually has.
CREATE TABLE grocery_store_classes (
  id          TEXT PRIMARY KEY,          -- 'supermarket', 'asian', 'online'
  name        TEXT NOT NULL,
  -- Ordering for the shopping list: lower comes first, so a plan groups the
  -- weekly shop before the special trip.
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- The canonical ingredient. Deliberately separate from ingredientLexicon.ts,
-- which is a translation table with no opinion about whether a thing exists in
-- Britain. This one is about the world, not about words.
CREATE TABLE grocery_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_en TEXT NOT NULL UNIQUE,
  canonical_zh TEXT,
  category     TEXT NOT NULL DEFAULT 'other',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every other way the same thing gets written — by the model, by a user, on a
-- packet. Matching happens here rather than by fuzzy comparison against
-- canonical_en, for the same reason the lexicon is exact-match: a shopping
-- list that sends someone home with the wrong vegetable is worse than one that
-- admits it does not know.
CREATE TABLE grocery_item_aliases (
  grocery_item_id UUID NOT NULL REFERENCES grocery_items(id) ON DELETE CASCADE,
  alias           TEXT NOT NULL,
  PRIMARY KEY (grocery_item_id, alias)
);

CREATE INDEX grocery_item_aliases_alias_idx ON grocery_item_aliases (lower(alias));

-- The join that answers the actual question. A row means "buyable"; no row
-- means "not known to be buyable", which is not the same as "unbuyable" and is
-- treated as such — see docs/rag.md on failing open.
CREATE TABLE grocery_availability (
  grocery_item_id UUID NOT NULL REFERENCES grocery_items(id) ON DELETE CASCADE,
  region_id       TEXT NOT NULL REFERENCES grocery_regions(id) ON DELETE CASCADE,
  store_class_id  TEXT NOT NULL REFERENCES grocery_store_classes(id) ON DELETE CASCADE,

  -- 'common' is on the shelf all year; 'seasonal' appears and disappears;
  -- 'specialist' means one shop in the city carries it. A plan can be asked to
  -- prefer 'common' without banning the rest.
  availability    TEXT NOT NULL DEFAULT 'common'
                  CHECK (availability IN ('common', 'seasonal', 'specialist')),

  -- Reference price, not a quote. Populated by hand where it is known, and the
  -- interface must never present it as a real supermarket price.
  typical_price_gbp NUMERIC(10, 2),
  typical_unit      TEXT,

  notes           TEXT,

  PRIMARY KEY (grocery_item_id, region_id, store_class_id)
);

-- Substitutions, directional. Pak choi substitutes for choi sum acceptably;
-- the reverse is not equally true, and a symmetric table would claim it was.
CREATE TABLE grocery_substitutions (
  grocery_item_id     UUID NOT NULL REFERENCES grocery_items(id) ON DELETE CASCADE,
  substitute_item_id  UUID NOT NULL REFERENCES grocery_items(id) ON DELETE CASCADE,
  region_id           TEXT REFERENCES grocery_regions(id) ON DELETE CASCADE,

  -- 1 is "nobody would notice", 5 is "different dish". Kept coarse on purpose:
  -- a finer scale would imply a precision that a hand-curated table does not
  -- have.
  closeness           SMALLINT NOT NULL CHECK (closeness BETWEEN 1 AND 5),
  note                TEXT,

  PRIMARY KEY (grocery_item_id, substitute_item_id),
  -- An ingredient cannot substitute for itself; that row would make every
  -- lookup trivially succeed.
  CHECK (grocery_item_id <> substitute_item_id)
);

-- ---------------------------------------------------------------------------
-- Retrieval: semantic
-- ---------------------------------------------------------------------------

-- The source document, kept whole. Chunks are derived and can be rebuilt when
-- the chunking strategy changes; the document is what a human curated and must
-- survive that.
CREATE TABLE knowledge_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 'regional-dish', 'technique', 'substitution-note', 'shopping-guide'
  kind         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,

  -- Scoping, so retrieval can be constrained before similarity is considered.
  -- A household that cooks Hunan and Jeolla should not be shown a Neapolitan
  -- document merely because its embedding sits nearby.
  cuisine      TEXT,
  region       TEXT,
  locale       TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'zh')),

  -- Where this came from. A curated corpus without provenance is indefensible
  -- the first time somebody asks whether it can be published.
  source       TEXT,
  source_url   TEXT,
  licence      TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_documents_scope_idx ON knowledge_documents (cuisine, region, locale);

-- 1536 matches text-embedding-3-small. Fixed in the column type, so changing
-- model means a migration — which is correct: embeddings from two models are
-- not comparable and silently mixing them makes retrieval quietly worse rather
-- than loudly broken.
CREATE TABLE knowledge_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,

  chunk_index  INTEGER NOT NULL,
  content      TEXT NOT NULL,

  -- Nullable so a document can be inserted before it is embedded. An unindexed
  -- corpus is a normal intermediate state, not an error.
  embedding    VECTOR(1536),

  -- Which model produced the embedding. Without it, a model change leaves rows
  -- that look valid and are not.
  embedding_model TEXT,
  embedded_at  TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (document_id, chunk_index)
);

-- HNSW over cosine distance. Created now and empty: building it later over a
-- populated table locks writes for as long as the build takes.
CREATE INDEX knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Partial index for the indexing job: "what still needs embedding" is the only
-- question that query ever asks.
CREATE INDEX knowledge_chunks_unembedded_idx
  ON knowledge_chunks (document_id)
  WHERE embedding IS NULL;

-- Reference data. Rows, not code, because a region or a store class is data a
-- non-engineer should be able to add.
INSERT INTO grocery_store_classes (id, name, sort_order) VALUES
  ('supermarket', 'Mainstream supermarket', 10),
  ('asian',       'Asian grocer',           20),
  ('online',      'Online only',            30);

INSERT INTO grocery_regions (id, name, parent_id) VALUES
  ('uk',        'United Kingdom', NULL),
  ('uk-london', 'London',         'uk');

-- Down Migration

DROP TABLE IF EXISTS knowledge_chunks;
DROP TABLE IF EXISTS knowledge_documents;
DROP TABLE IF EXISTS grocery_substitutions;
DROP TABLE IF EXISTS grocery_availability;
DROP TABLE IF EXISTS grocery_item_aliases;
DROP TABLE IF EXISTS grocery_items;
DROP TABLE IF EXISTS grocery_regions;
DROP TABLE IF EXISTS grocery_store_classes;

-- The extension is deliberately left in place: other things may come to depend
-- on it, and dropping an extension is not the sort of thing a down-migration
-- should do on its way past.
