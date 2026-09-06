# AI meal plan generation

How a plan is produced, why the output is trusted, and what it costs.

The governing idea is that **a prompt is a request, not a guarantee.** Every
property the product depends on is enforced somewhere the model cannot argue
with: a schema it must fill, or a check that runs after it has answered.

---

## Three layers

| Layer | Mechanism | What it can guarantee |
| --- | --- | --- |
| Prompt | System and user messages | Nothing. It shapes the answer; it does not constrain it |
| Schema | Zod → JSON schema, enforced by the OpenAI structured-output API | Shape and vocabulary. Malformed JSON is not a failure mode, and a cuisine outside the household's list is unrepresentable |
| Post-check | Deterministic code over the parsed plan, with one retry | Truth. Allergens, meal count, arithmetic, budget and language |

The cuisine enum is **built per request** from the user's own selections, so
the third layer never has to catch an out-of-list cuisine — the second one
made it impossible.

### AI Meal Plan Generation

Three layers, and only the third is a guarantee: **prompt → schema → programmatic check with a retry.** A prompt is a request; a schema constrains shape but not truth; the post-check is the part that holds.

- Output shape is enforced through a JSON schema derived from Zod. The cuisine enum is **built per user**, so a cuisine outside their list is not merely discouraged but unrepresentable
- Avoided ingredients are scanned across every dish name and ingredient after generation. A violation triggers one retry naming the specific dish and ingredient, because repeating a rule the model already broke does not help
- Budget compliance is deterministic: the stated total must equal the sum of the meals, and the plan must land within a tolerance band that widens with the budget and never drops below £10
- Variety comes from rotating regions, techniques and store-cupboard staples with a 40-dish do-not-repeat list — **not** from example dishes. Naming example dishes in the prompt caused the model to return them verbatim
- Language compliance is checked after generation too: an English plan containing Chinese dish names is retried. `native_name` is exempt, because keeping the dish's own script is what that field is for. Unlike safety and budget, a language failure gives way after one retry — refusing to show a safe plan over its wording is worse than showing it
- Every call is recorded in `ai_usage` — including failures and retries, since both cost money — while only the attempt that produced a usable plan counts against the quota

---

### Agent-style generation experience

Generation streams over SSE (`fetch` + `ReadableStream`, not `EventSource`, which cannot POST with credentials).

- **Five stages, because there are five real stages.** No invented chain-of-thought, no percentage: the step is known, the distance through a model call is not, and a number for it would be a lie
- Insight chips report values measured **before** the model answers — how many preferences were read, which ingredient expires soonest, the budget target
- A retry is named rather than hidden, so a rejected first attempt is visible work instead of thirty unexplained seconds
- Eight mascot illustrations, preloaded, crossfading on a fixed aspect ratio so nothing shifts. The weekly and cook-from-pantry flows use different pose sets; three poses are shared on purpose, because differing artwork would imply a difference that is not there
- `prefers-reduced-motion` holds the pose still

---

### Cook from what is in the kitchen

Pick up to twelve pantry items and get dishes built around them. Counted under its own monthly quota so it never eats the weekly-plan allowance, and cheaper per call. The allergen scan runs identically — a shorter answer is not a less dangerous one.

---

### Bilingual interface and content

English and Simplified Chinese, throughout — not only the chrome.

- The interface language is a user setting, sent as `Accept-Language` on every request. Reading the browser's header instead would mean the toggle did nothing, which is exactly the bug this replaced
- Meal plans are **generated** in the reader's language, and the language a plan was written in is recorded on the row
- A stored plan opened in the other language is **translated on demand and cached**, one call per plan per language. Only user-facing strings are sent to the model: costs, cuisine enums, day indices and quantities never enter the prompt, so a translation cannot alter what the household is told to spend
- Translation is indexed and batched, so a short or partial answer costs only the entries actually missing rather than discarding the whole plan. Partial results are not cached, or a half-translated page would never retry

### The ingredient lexicon

Ingredient names are over half the translatable strings in a plan and they
repeat endlessly across plans and users. Garlic is garlic. A curated
bilingual table of 220 ingredients and 22 units answers them before
anything reaches a model.

Matching is **exact only**. Substring matching would resolve 青椒炒肉丝 to
"green pepper", and a shopping list that sends someone home with the wrong
vegetable is worse than one written in the other language. A miss falls
through to the model, which is the safe direction to fail.

Qualified names are handled by decomposition rather than by adding a row per
combination: the model writes 带骨鸡腿, not 鸡腿, and the combinations multiply
while the bases do not. One known modifier is peeled off, the base is looked
up, and the modifier is reapplied in the target language — 带骨鸡腿 becomes
"Bone-in chicken thigh". Only one peel, and only into English, because 带骨 and
"bone-in" agree on position while 薄片 and "thinly sliced" agree on neither.

The client carries a **generated** copy of the table so the pantry and
shopping list can be displayed in the reader's language without a request.
A test regenerates it and fails if the committed copy has drifted.

---

### Spend control

A global monthly ceiling on AI spend, checked before any generation a free account triggers.

- Paying customers are never refused by it; only free accounts are, and the message says so plainly
- Warns in the logs at 80% of the cap
- Free-tier cost works out to roughly £0.065 per user per month, so 1,000 free users sit under a £100 ceiling — with a test asserting it

### Cost model

`services/costModel.ts` holds the token shape of every AI call and is read by
a test, so a quota change or a longer prompt fails the build rather than
quietly going stale. The figures are estimates; `ai_usage` records what was
actually spent and is the authority.

| Call | Estimated cost |
| --- | --- |
| Weekly plan (14 meals) | £0.0033 |
| Cook from pantry (3 dishes) | £0.0009 |
| Plan translation, card scope | £0.0007 |
| Plan translation, full scope | £0.0032 |

A full translation once cost **more** than the generation it translated —
output tokens dominate the bill and a translation reproduces the plan's whole
text plus a JSON envelope. Lazy scoping and the lexicon brought it below the
cost of a generation. That reversal is asserted in a test, because the free
tier's quotas were set against it.
