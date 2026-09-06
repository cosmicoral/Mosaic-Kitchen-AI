# Knowledge base and retrieval

**Status: schema only.** The tables exist, the SQL is written and tested, and
the corpus is empty. No embedding job has run, `RETRIEVAL_ENABLED` defaults to
off, and no generation path reads any of it. Generation behaves identically
with the flag on or off.

It is landed early because the *shape* of the data is the hard part, and an
empty table is easier to argue about than one somebody has already filled in
the wrong shape.

---

## Two problems, deliberately separated

The obvious framing — "RAG over a recipe corpus" — hides that there are two
different questions here, and only one of them is a similarity question.

| Question | Nature | Mechanism |
| --- | --- | --- |
| Can this be bought where the household shops? | A fact, with a yes/no answer | Table lookup, deterministic |
| What could replace it, and what do people in Hunan actually cook? | Similarity and context | Vector retrieval |

Answering the first with vector search would return "here is something
similar", which is not an answer to "is 香椿 on a shelf in Sheffield". Getting
that wrong is how a planner confidently sends somebody shopping for an
ingredient no UK supermarket stocks — which is the failure this whole subsystem
exists to prevent.

So availability is a table, checked after generation in the same layer as the
allergen and budget rules. Retrieval is reserved for the questions that are
genuinely about similarity.

---

## Grocery catalogue

```
grocery_regions ──┐
                  ├──> grocery_availability <── grocery_items ──> grocery_item_aliases
grocery_store_classes ┘                              │
                                                     └──> grocery_substitutions
```

**Store class, not retailer.** Tesco's range changes weekly, there is no public
stock or price API, and a per-retailer table would be stale the day after it
was written. "Mainstream supermarket, Asian grocer, or online only" is both
stable and the question a shopper actually has — and it lets a shopping list
group the weekly shop separately from the special trip.

**Regions nest.** `uk-london` inherits everything true of `uk` through a
recursive CTE, so an item only needs a row where it differs. Availability is
not uniform within a country: the same ingredient is a corner-shop staple in
parts of London and a two-hour drive elsewhere.

**Aliases are exact-match**, for the same reason as the ingredient lexicon.
A near-match here puts the wrong vegetable on a shopping list, and a miss is
recoverable while a confident error is not.

**Substitutions are directional.** Pak choi substitutes for choi sum
acceptably; the reverse is not equally true, and a symmetric table would claim
it was. `closeness` is a coarse 1–5 because a finer scale would imply a
precision a hand-curated table does not have.

### Failing open

`checkAvailability` returns `unknown` for anything not in the catalogue, and
callers must treat that as permitted.

This is the **opposite** of the allergen check, on purpose. An unrecognised
allergen fails closed because the cost of being wrong is somebody's health; an
unrecognised vegetable fails open because the cost is a slightly awkward
shopping trip. An empty catalogue rejecting every plan would be a compliance
check that blocks a working product until a data-entry task is finished.

---

## Retrieval

| Choice | Reasoning |
| --- | --- |
| pgvector inside Neon | One datastore, one backup, one consistency story. Retrieval can be constrained by the same `WHERE` clause that reads the household's cuisines, which an external vector database could not do without shipping the filter to it |
| HNSW over cosine distance | Built empty. Creating it later over a populated table locks writes for the length of the build |
| `VECTOR(1536)` fixed in the column | Matches `text-embedding-3-small`. Changing model means a migration, which is correct: embeddings from two models are not comparable, and mixing them makes retrieval quietly worse rather than loudly broken |
| `embedding_model` stored per chunk | Without it, a model change leaves rows that look valid and are not |
| Scope filtered before ranking | A household cooking Hunan and Jeolla should not be shown a Neapolitan document because its embedding sits nearby. Nearest-neighbour has no notion of relevance, only of distance. Ranking first and filtering after is the classic way to return six results about the wrong cuisine and discard five |
| Documents and chunks separate | Chunking strategy will change; the curated document must survive that. Chunks are derived and rebuildable, documents are not |
| `embedding` nullable | An unindexed corpus is a normal intermediate state, not an error |

### Provenance

`knowledge_documents` carries `source`, `source_url` and `licence`. A curated
corpus without provenance is indefensible the first time somebody asks whether
it can be published, and retrofitting it means re-checking every document by
hand.

---

## What is deliberately not built

- **No embedding job.** `findUnembeddedChunks` is the work queue and is
  written; the loop that calls the embedding API is not
- **No `retrieve()` implementation.** Enabling the flag with an unimplemented
  retriever throws with a message pointing here, rather than silently returning
  nothing and looking like it worked
- **No corpus.** Not a single document
- **No wiring into generation.** `promptBuilder` does not consult either the
  catalogue or the index

---

## Turning it on, in order

1. Seed `grocery_items`, `grocery_item_aliases` and `grocery_availability` for
   `uk`. This alone is useful **without any retrieval at all**: it lets
   `findHardToBuy` become a post-generation check beside the allergen one
2. Wire that check into `mealPlanService`, with a retry that names the
   ingredient — the same pattern as every other compliance rule
3. Curate `knowledge_documents` with provenance, chunk them, run an embedding
   job over `findUnembeddedChunks`
4. Implement `retrieve()` against `searchChunks`
5. Set `RETRIEVAL_ENABLED=true` and measure whether plans actually improve

Steps 1 and 2 are the ones with a clear payoff. Steps 3–5 are the ones that
sound impressive, and they should not be started until 1 and 2 have shown that
the catalogue is worth maintaining.
