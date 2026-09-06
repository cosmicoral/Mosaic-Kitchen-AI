# 🥗 Mosaic Kitchen AI

**AI-powered multicultural meal planning and grocery assistant for diverse households in the UK.**

> Built on PhD research in healthy eating practices, food waste, digital food platforms, and multicultural food consumption.

---

## 🌍 Vision

Mosaic Kitchen helps multicultural households make healthier, cheaper, and more culturally relevant food decisions.

Most meal planning applications are designed around mainstream Western diets and often overlook the needs of diverse communities. Mosaic Kitchen bridges this gap by combining AI-powered meal planning, cultural food knowledge, and grocery optimisation into a single platform.

### Research Inspiration

Mosaic Kitchen is informed by doctoral research on:

- Healthy eating practices
- Food waste reduction
- Digital food platforms
- Everyday food consumption
- Ethnicity and food culture
- Household food routines

A key insight from this research is that people often struggle with healthy and sustainable eating not because of a lack of knowledge, but because of time constraints, disrupted routines, cultural preferences, and everyday practical challenges.

---

## 🥢 Key Principles

- Cultural food preferences matter
- AI should support everyday routines
- Reduce food waste before it happens
- Save money through smarter planning
- Support multicultural households
- Make healthy eating easier, not harder

---

## 👥 Target Users

### Primary Users (MVP)

- Chinese households in the UK
- International students
- Asian families
- Busy professionals

### Future Expansion

- Halal households
- Japanese households
- Korean households
- South Asian households
- Multicultural families

---

# ✅ What Works Today

This section describes what is actually built and tested, as distinct from the roadmap below.

### Authentication

Hand-rolled session authentication rather than a library or a managed service, so that every part of it is understood and controllable.

- bcrypt password hashing at cost factor 12
- Signup requires at least 8 characters with uppercase, lowercase, number and special-character checks in both the UI and API
- Sessions stored in PostgreSQL, so a session can be revoked with a `DELETE`
- Session IDs are 256 bits from `crypto.randomBytes`, never a predictable value
- `HttpOnly` cookies, so JavaScript cannot read the credential and XSS cannot exfiltrate it
- Timing-attack defence: a login for an unknown email still runs a bcrypt comparison, so response time cannot be used to discover which addresses are registered
- Rate limiting on auth routes, `helmet` security headers, and a CORS allowlist that never uses a wildcard alongside credentials

### Sign in with Google

Built on `openid-client` v6 directly rather than a wrapper.

- PKCE, `state` and `nonce` are generated per attempt and held in one short-lived `HttpOnly` cookie
- Identities are keyed on `(provider, sub)`, **never on email**. A provider can change the email attached to an account; the subject identifier is the stable one. Keying on email is how account-takeover bugs happen
- `password_hash` is nullable, because an account that arrived through Google has no password. Every read of it handles `null` rather than assuming a string
- Sign in with Apple is deliberately not built yet — it needs a paid Apple Developer account and a verified domain, neither of which exists

### Account and data rights

UK GDPR gives people a right to a copy of their data and a right to have it erased. Both are built, because a product taking UK household data cannot ship without them.

- **Export** returns everything the account owns — profile, pantry, meal plans, shopping list — as a JSON download, in the shape it is stored. Passwords and session ids are excluded: those are credentials, not personal data anyone needs back
- **Deletion** is irreversible and says so. It requires the account's own email address typed exactly, which a mis-click cannot produce. Stripe is cancelled **before** the row is deleted, because the delete cascades the subscription record away and there would be no id left to cancel — the account would be gone and the card would keep being charged
- If Stripe is unreachable the account is still deleted and the failure is logged as `URGENT`. Holding a legal right hostage to a third party's uptime is the worse of the two options; a subscription cancelled by hand the next morning is the better one
- **Changing a password** works only where there is one to change. An account created through Google has `password_hash IS NULL`, and the page says why rather than offering a form that cannot work. *Setting* a first password on such an account is refused: it adds a second way in, and doing that silently from a session is a takeover path

### Billing

Stripe hosted Checkout and the Customer Portal, so no card data ever reaches this codebase.

- Webhooks are verified against the raw request body, mounted **before** `express.json()`, because a parsed and re-serialised body no longer matches the signature
- Each event id is recorded in `stripe_events` before being acted on, so a redelivery cannot apply the same change twice
- Subscription state is re-fetched from the Stripe API rather than trusted from the event payload, since events can arrive late or out of order
- An unrecognised price id resolves to the free tier. Failures should cost the business, not hand out entitlements

| | Free | Plus | Pro |
| --- | --- | --- | --- |
| Monthly | £0 | £6.99 | £11.99 |
| Yearly | £0 | £69.99 | £119.99 |
| Household members | 1 | 2 | 6 |
| Meal plans / month | 6 | 10 | 30 |
| Meals per plan | 7 | 14 | 21 |
| Cook-from-pantry / month | 5 | 30 | 100 |
| Plan translations / month | 4 | 20 | 60 |
| Camera scans / month | — *(not built)* | — *(not built)* | — *(not built)* |

Camera scanning is listed in the entitlement table because the quota plumbing exists, but the feature does not. It is labelled "coming soon" in the interface and is not sold as available.

The allowances are a decision made against `services/costModel.ts`, which holds the token shape of every AI call and is read by a test. If a quota moves or a prompt grows, that test fails and the decision gets made again rather than going stale.

Worst case — every allowance used to the last one:

| | AI cost / month | Revenue | Share |
| --- | --- | --- | --- |
| Free | £0.044 | £0 | £100 cap reached at ~2,250 users |
| Plus | £0.12 | £6.99 | 1.7% |
| Pro | £0.40 | £11.99 | 3.3% |

**Free plans went from eight to six to pay for four translations.** The counter-intuitive part is that a translation costs about **1.4× the generation it translates**: output tokens dominate the bill, a translation reproduces the plan's entire user-facing text, and the indexed JSON envelope adds a per-string overhead on top. Leaving free at eight plans and adding eight translations would have moved the £100 ceiling from roughly 3,100 users to 1,400 — over half the runway spent on a feature most users never touch.

The paid tiers were **not** cut to fund it. A Plus account using every allowance costs twelve pence of AI against £6.99 of revenue; trimming that would save fractions of a penny and cost a paying customer something they can feel. Their translation numbers are a bound on a runaway loop, not a ration.

### Pantry

Full CRUD over ingredients with quantities, units and expiry dates.

- Ownership is enforced in the SQL `WHERE` clause rather than checked after the fetch, so another user's row is structurally unreachable
- "Missing", "malformed id" and "belongs to someone else" all return an identical 404, so responses cannot be used to probe for what exists
- Expiry is stored as a `DATE` and returned as a plain `YYYY-MM-DD` string, avoiding the off-by-one-day class of timezone bug
- Bulk select drives both bulk delete and cook-from-pantry, so one selection serves two actions

### Household Profile

Onboarding captures only what the meal planner consumes.

- Household is split into adults, teenagers, children and toddlers, because each band changes the plan differently — teenagers eat more than adults, toddlers need mild and choke-safe food
- Dietary presets such as Halal tick ingredient exclusions rather than storing a diet label, so the database records what someone does not eat instead of what they believe
- Cuisines come from a closed list because they have to match recipe tags; **regions** narrow them further (Hunan, Yunnan, Jeolla, Kansai…), because "Chinese" is not a cuisine anyone actually cooks
- Flavour preferences — seasoning intensity, low salt, low sugar, tastes to favour — and nutrition emphasis are stored as machine-readable values and phrased as ingredient guidance in the prompt
- Avoided ingredients are free text, including anything the user types themselves, because allergies cannot be enumerated in advance

### AI Meal Plan Generation

Three layers, and only the third is a guarantee: **prompt → schema → programmatic check with a retry.** A prompt is a request; a schema constrains shape but not truth; the post-check is the part that holds.

- Output shape is enforced through a JSON schema derived from Zod. The cuisine enum is **built per user**, so a cuisine outside their list is not merely discouraged but unrepresentable
- Avoided ingredients are scanned across every dish name and ingredient after generation. A violation triggers one retry naming the specific dish and ingredient, because repeating a rule the model already broke does not help
- Budget compliance is deterministic: the stated total must equal the sum of the meals, and the plan must land within a tolerance band that widens with the budget and never drops below £10
- Variety comes from rotating regions, techniques and store-cupboard staples with a 40-dish do-not-repeat list — **not** from example dishes. Naming example dishes in the prompt caused the model to return them verbatim
- Language compliance is checked after generation too: an English plan containing Chinese dish names is retried. `native_name` is exempt, because keeping the dish's own script is what that field is for. Unlike safety and budget, a language failure gives way after one retry — refusing to show a safe plan over its wording is worse than showing it
- Every call is recorded in `ai_usage` — including failures and retries, since both cost money — while only the attempt that produced a usable plan counts against the quota

### Agent-style generation experience

Generation streams over SSE (`fetch` + `ReadableStream`, not `EventSource`, which cannot POST with credentials).

- **Five stages, because there are five real stages.** No invented chain-of-thought, no percentage: the step is known, the distance through a model call is not, and a number for it would be a lie
- Insight chips report values measured **before** the model answers — how many preferences were read, which ingredient expires soonest, the budget target
- A retry is named rather than hidden, so a rejected first attempt is visible work instead of thirty unexplained seconds
- Eight mascot illustrations, preloaded, crossfading on a fixed aspect ratio so nothing shifts. The weekly and cook-from-pantry flows use different pose sets; three poses are shared on purpose, because differing artwork would imply a difference that is not there
- `prefers-reduced-motion` holds the pose still

### Cook from what is in the kitchen

Pick up to twelve pantry items and get dishes built around them. Counted under its own monthly quota so it never eats the weekly-plan allowance, and cheaper per call. The allergen scan runs identically — a shorter answer is not a less dangerous one.

### Bilingual interface and content

English and Simplified Chinese, throughout — not only the chrome.

- The interface language is a user setting, sent as `Accept-Language` on every request. Reading the browser's header instead would mean the toggle did nothing, which is exactly the bug this replaced
- Meal plans are **generated** in the reader's language, and the language a plan was written in is recorded on the row
- A stored plan opened in the other language is **translated on demand and cached**, one call per plan per language. Only user-facing strings are sent to the model: costs, cuisine enums, day indices and quantities never enter the prompt, so a translation cannot alter what the household is told to spend
- Translation is indexed and batched, so a short or partial answer costs only the entries actually missing rather than discarding the whole plan. Partial results are not cached, or a half-translated page would never retry

### Spend control

A global monthly ceiling on AI spend, checked before any generation a free account triggers.

- Paying customers are never refused by it; only free accounts are, and the message says so plainly
- Warns in the logs at 80% of the cap
- Free-tier cost works out to roughly £0.065 per user per month, so 1,000 free users sit under a £100 ceiling — with a test asserting it

### Testing

**177 backend tests** and **11 frontend tests.** The backend suite runs against a dedicated Neon branch and truncates between tests; 6 of the 17 files need that database and will refuse to run without `NODE_ENV=test`.

Coverage includes cross-user isolation, expired-session rejection, password policy, rate limiters, entitlement resolution, budget arithmetic, language compliance, translation safety, bilingual prompts, and two regression tests written after real bugs:

- `profileUpsert.test.ts` reads the SQL source and asserts every column appears in both the `INSERT` and the `ON CONFLICT DO UPDATE SET` list. Two preference fields had been saving on create and silently ignoring updates
- `aiUsageFeatures.test.ts` compares the feature keys used in code against the `CHECK` constraint in the migrations. A key added in code but not in the constraint made every cook-from-pantry request fail **after** a paid model call — a failure typechecking cannot see, because it lives inside a SQL string

---

# 🏗 Architecture

## Layering

```
route → controller → service → repository → pg pool → PostgreSQL
```

Each layer knows only about the one below it:

- **Controllers** know about HTTP — status codes, cookies, `req`/`res` — and nothing about SQL
- **Services** know about business rules and nothing about HTTP, which is why they throw tagged errors (`error.code = 'QUOTA_EXCEEDED'`) for the controller to translate into a status code
- **Repositories** know about SQL and nothing about business rules

The practical payoff: services are testable without an HTTP server, and adding a second client — an iOS app — requires no changes below the controller.

## Data

Raw `pg` with hand-written SQL rather than an ORM, and `node-pg-migrate` with plain `.sql` migration files. Every query is parameterised; no SQL is ever assembled from user input.

Storage choices follow one rule: **columns for things you filter and update, a JSON document for an immutable artifact you always read whole**. Profiles get columns; generated meal plans get `JSONB`, because they are never queried into and their shape will keep changing as prompts evolve.

## Repository layout

```text
Mosaic-Kitchen-AI/
├── backend/
│   ├── migrations/          # plain .sql, forward-only
│   ├── src/
│   │   ├── routes/          # URL to controller, plus per-route middleware
│   │   ├── controllers/     # HTTP in, HTTP out
│   │   ├── services/        # business rules, validation, AI orchestration
│   │   ├── repositories/    # the only place SQL lives
│   │   ├── middleware/      # requireAuth, rate limiters
│   │   ├── schemas/         # Zod schemas for AI structured outputs
│   │   ├── config/          # cookie options
│   │   ├── db/              # connection pool
│   │   ├── types/           # shared types, Express augmentation
│   │   └── utils/           # prompt construction
│   ├── tests/
│   └── scripts/             # session cleanup, connection check
│
├── web/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/         # auth and onboarding state
│       ├── hooks/           # data fetching per feature
│       ├── lib/             # API client and formatting helpers
│       └── types/
│
└── docs/
    └── auth.md              # authentication design and its known gaps
```

---

# 🛠 Local Development

## Prerequisites

- **Node.js 24 or newer.** The backend runs TypeScript directly through Node's native type stripping, so there is no build step — but the feature is only stable from Node 24.12 / 25.2 onwards
- A [Neon](https://neon.com) PostgreSQL database (the free tier is enough)
- An OpenAI API key

## Backend

```bash
git clone https://github.com/cosmicoral/Mosaic-Kitchen-AI.git
cd Mosaic-Kitchen-AI/backend

npm install
cp .env.example .env      # then fill in the values

npm run migrate:up        # create the schema
npm run dev
```

## Frontend

```bash
cd web
npm install
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:3000
npm run dev
```

## Environment variables

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
OPENAI_API_KEY=your_openai_api_key

# development | production — controls secure/sameSite cookie flags and trust proxy
NODE_ENV=development
PORT=3000

# Comma-separated browser origins allowed to send credentialed requests
CORS_ORIGINS=http://localhost:5173

# Where the browser lives, and where this API answers. Used to build OAuth
# redirect URIs and Stripe return URLs, so they must be the real origins.
APP_URL=http://localhost:5173
API_ORIGIN=http://localhost:3000

# Optional. Must exist in MODEL_PRICING in services/openai.ts
OPENAI_MODEL=gpt-5.6-luna

# Global ceiling on AI spend attributable to free accounts. Paying customers
# are never refused by it. Warns in the logs at 80%.
FREE_TIER_MONTHLY_SPEND_CAP_GBP=100

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PLUS_MONTHLY=
STRIPE_PRICE_PLUS_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
```

`node --watch` only watches `.ts` files, so a change to `.env` needs `node --watch --env-file=.env src/server.ts` or a manual restart. An edited value that appears to have no effect is usually this.

## Tests

The suite runs against a **separate database** and truncates tables between tests. Point it at a dedicated Neon branch, never at your development branch.

```bash
cp .env.test.example .env.test   # then set DATABASE_URL to the test branch
npm run migrate:up:test          # create the schema on that branch
npm test
```

## Useful commands

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start the API with file watching |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run the integration suite |
| `npm run migrate:create -- <name>` | Scaffold a new `.sql` migration |
| `npm run migrate:up` / `migrate:up:test` | Apply migrations to dev / test |
| `npm run cleanup:sessions` | Delete expired sessions (intended as a daily cron) |

---

# 🚢 Deployment Plan

Not deployed yet. This is the plan, written down before the fact so the order and the reasoning are on record.

## Shape

```
Vercel (web)  ──HTTPS──▶  nginx on a Hetzner VPS  ──▶  Node/Express  ──▶  Neon Postgres
   app.<domain>                api.<domain>
```

Frontend on Vercel because it is static and benefits from a CDN. API on a small VPS rather than a serverless platform for three concrete reasons, not preference:

1. **SSE.** Generation streams for thirty seconds or more. Serverless request timeouts and response buffering are hostile to that
2. **Stripe webhooks need the raw body.** Straightforward on Express, fiddly wherever a platform parses the body first
3. **A long-lived `pg` pool.** Serverless functions open a connection per invocation, which is how a free Neon tier runs out of connections

## Order of work

Each step must be finished before the next, because each one is a prerequisite for the one after — not merely a preference for ordering.

| # | Step | Why it must come first |
| --- | --- | --- |
| 1 | Buy the domain | Nothing else can be verified without it: no TLS certificate, no OAuth redirect URI, no email sending domain |
| 2 | Provision the VPS, non-root user, SSH keys only, firewall to 22/80/443 | A box reachable on other ports is a box being scanned right now |
| 3 | DNS: `api` and `app` records | Certbot validates over HTTP against the real name |
| 4 | nginx + Let's Encrypt on `api.<domain>` | Cookies are `Secure` in production, so nothing authenticates over plain HTTP |
| 5 | `proxy_buffering off` for the SSE routes | **Without this the generation UI hangs.** nginx buffers the response by default and the stream arrives all at once at the end, which looks exactly like a broken feature |
| 6 | systemd unit, `NODE_ENV=production`, run migrations | `trust proxy` and the secure-cookie flags key off `NODE_ENV` |
| 7 | Deploy the frontend to Vercel, set `VITE_API_URL` | — |
| 8 | Cross-site cookies: `SameSite=None; Secure`, `CORS_ORIGINS` set to the real origin | `app.<domain>` and `api.<domain>` are different sites to a browser. `SameSite=Lax` silently drops the session cookie on cross-site requests, and the symptom is a 401 on every call after login |
| 9 | Add the production redirect URI in Google Cloud Console | OAuth fails closed on an unregistered URI |
| 10 | Point the Stripe webhook at `api.<domain>`, take the **live** signing secret | The test-mode secret does not verify live events |
| 11 | Verify end to end against production: sign in, generate, checkout, cancel | Everything above has only ever been exercised on localhost |

## nginx, the parts that are not boilerplate

```nginx
location /api/meal-plan/stream        { proxy_pass http://127.0.0.1:3000; proxy_buffering off; proxy_read_timeout 300s; }
location /api/meal-plan/pantry-cook/stream { proxy_pass http://127.0.0.1:3000; proxy_buffering off; proxy_read_timeout 300s; }
```

The backend already sends `X-Accel-Buffering: no` on those routes, which nginx honours — but the explicit `proxy_buffering off` is kept as well, so the behaviour does not depend on one header surviving a config change.

## Environment differences from local

```env
NODE_ENV=production
APP_URL=https://app.<domain>
API_ORIGIN=https://api.<domain>
CORS_ORIGINS=https://app.<domain>
COOKIE_SAMESITE=none

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...        # the live endpoint's secret, not the CLI's
STRIPE_PRICE_PLUS_MONTHLY=price_...    # live-mode price ids
STRIPE_PRICE_PLUS_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...

FREE_TIER_MONTHLY_SPEND_CAP_GBP=100
```

## Operational, before real users

- `npm run cleanup:sessions` on a daily cron
- Neon's own backups are the recovery story; a restore has to be rehearsed once, or it is an assumption rather than a backup
- Watch the spend-guard warning in the logs — it fires at 80% of the monthly AI cap
- Watch for `URGENT: could not cancel Stripe subscription`, which means an account was deleted while Stripe was unreachable and a card is still being charged

## Blocked on the domain

These are not scheduling choices — they cannot be built until a domain exists and can send verified email:

- **Password reset.** Needs single-use expiring tokens and a provider sending from a verified domain
- **Change email.** Without confirmation to the new address, anyone with a stolen session could move the account to their own address
- **Setting a first password on a Google account.** That adds a second way in, and doing it silently from a session is a takeover path. It is refused today, with the reason stated
- **Sign in with Apple.** Needs a paid Apple Developer account and domain verification

---

# 🧱 Tech Stack

| Layer | Technology |
| ----- | ---------- |
| UI/UX design | Figma |
| Web frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript (native type stripping, no build step) |
| Database | Neon (PostgreSQL 18) |
| Database access | `pg` with hand-written SQL |
| Migrations | node-pg-migrate, plain `.sql` files |
| Authentication | Hand-rolled sessions — bcrypt, HttpOnly cookies, sessions in Postgres |
| AI text generation | OpenAI, structured outputs constrained by a Zod-derived JSON schema |
| Schema validation | Zod |
| Testing | Node's built-in `node:test` + Supertest |
| Version control | GitHub |
| OAuth | `openid-client` v6 — PKCE, state and nonce |
| Payments | Stripe hosted Checkout and Customer Portal |
| Streaming | Server-Sent Events over `fetch` + `ReadableStream` |
| Planned: deployment | Vercel (web) + nginx on a Hetzner VPS (API) |
| Planned: mobile | SwiftUI |
| Planned: AI vision | OpenAI Vision |
| Planned: vector search | pgvector |

---

# ⚠️ Known Gaps

Written down deliberately — an honest list is more useful than a clean one.

- **Not deployed.** Production cookie behaviour (`Secure`, `SameSite=None`), CORS across two real subdomains, and SSE through nginx have never been exercised outside localhost
- **No email verification, no password reset, no change-email.** All three need a provider sending from a verified domain. The forgot-password screen says so plainly instead of pretending to send anything
- **Camera scanning does not exist.** The quota field and the pricing row are there; the feature is labelled "coming soon" and is not sold as available
- **Expiry dates are user-entered.** A shelf-life lookup table is written but not wired into the pantry write path, so the app cannot yet estimate a date nobody typed
- **No account lockout.** Rate limiting is per-IP, so a distributed attack against one account is not slowed
- **Estimated costs are model guesses**, not supermarket prices. The arithmetic and the budget band are checked deterministically; the prices themselves are not real quotes, and the interface does not claim otherwise
- **The shopping list cannot be translated in place.** It is rows, not a document, and the tick state only exists there — so a list built in another language offers a rebuild and says what the rebuild will cost

---

# 🚀 Roadmap

## MVP 0.5 — React Web Application *(in progress)*

- [x] Session authentication
- [x] Sign in with Google
- [x] Stripe billing — Checkout, Customer Portal, verified webhooks
- [x] Pantry inventory CRUD, bulk select and delete
- [x] Household profile, regions, flavour and nutrition preferences
- [x] AI meal planning from real profile and pantry data
- [x] Cook from selected pantry ingredients, on its own quota
- [x] Deterministic budget and arithmetic compliance
- [x] Streaming agent-style generation over SSE
- [x] Usage and cost tracking, monthly quota, global free-tier spend cap
- [x] Shopping list generated from the meal plan
- [x] Expiry alerts from real pantry data
- [x] Dashboard wired to live data
- [x] English + Simplified Chinese interface, locale-aware generation and on-demand translation of stored plans
- [x] Settings — delete account, export data, change password
- [ ] **Deployment** — see the deployment plan above
- [ ] Password reset *(blocked on the domain)*
- [ ] Camera scanning, so the "coming soon" labels can come off

## MVP 1.0 — iOS Application

- Native mobile experience built on the same API
- Push notifications for expiring ingredients
- TestFlight release

### Smart food expiry notifications

> ⚠️ Your spinach expires in 2 days.

1. **Discard** — estimate the cost of the waste and log it
2. **Use while fresh** — generate recipes around the ingredient
3. **Use later** — suggest preservation methods and leftover-friendly recipes

## V2 — Food Intelligence

### AI vision inventory recognition

Photograph a fridge, pantry or shopping bag; the model identifies ingredients and updates the inventory.

### RAG-powered cultural food knowledge

Retrieval over a curated recipe corpus so that plans draw on real regional dishes rather than the model's general impression of a cuisine. This is the feature the whole product premise rests on: a Sichuan household and a Cantonese household should not receive the same suggestions.

### Food waste prevention workflow

Expiry notification → user chooses discard / use fresh / use later → AI produces the matching plan → inventory and waste records update.

## V3 — Grocery Ecosystem

Potential integrations: Tesco, Sainsbury's, Asda, Morrisons, UKCNSHOP, Longdan, Wing Yip, Japan Centre, HungryPanda.

> Worth noting honestly: UK supermarkets do not publish product price APIs, so this depends on either a third-party data source or a change in what is available. A curated reference price table is the realistic fallback.

---

# 🌐 Bilingual Plan

English and Simplified Chinese ship today, in the interface **and** in generated content. Japanese, Korean, Arabic and Hindi are later possibilities.

The groundwork that made this cheap: the database stores machine-readable values (`cultural-authenticity`, `vegetables`, `hunan`) and one file maps them to display labels, so adding a language touches that file rather than the schema. The same rule applies to the API — the generation stream sends stage identifiers and measured values, never prose, so no English sentence is ever stranded in a payload.

Two decisions worth recording:

- **`native_name` is never translated.** 剁椒鱼头 stays 剁椒鱼头 in an English plan. Every language check and the translator itself exempt that field, because preserving the dish's own script is the entire reason it exists
- **User-entered data is never translated.** A pantry item typed as 生抽 reads 生抽 in the English interface. Rewriting someone's own words amounts to telling them they spelled it wrong
- **Translation is metered separately from generation.** Charging a plan credit to read a plan you already own would charge twice for one thing, and would leave a bilingual household with half the plans of a monolingual one — the opposite of what this product is for. Running out is not an error either: the plan is shown in the language it was written in, because blocking the page over a translation budget takes away the thing the reader came for

---

# 🎯 Long-Term Goal

Become the AI decision layer connecting multicultural households with the UK food ecosystem, helping people answer:

- What should I cook this week?
- What ingredients do I already have?
- What is about to expire?
- What should I buy?
- How can I reduce food waste?
- How can I stay within budget?

---

## 📚 Research Background

Mosaic Kitchen is informed by doctoral research on healthy eating practices, food waste reduction, digital food platforms, ethnicity and food culture, and household food consumption.

**Google Scholar:** [View publications](https://scholar.google.com/citations?user=Gp9ylswAAAAJ)

**PhD thesis:** *Everyday Practices, Identities and Materiality of Food Consumption and Waste: A Case Study of Middle-Class Consumers in Kunming (China)* — University of Surrey, 2026

---

Built in London 🇬🇧
