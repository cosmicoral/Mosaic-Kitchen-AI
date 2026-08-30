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
- Sessions stored in PostgreSQL, so a session can be revoked with a `DELETE`
- Session IDs are 256 bits from `crypto.randomBytes`, never a predictable value
- `HttpOnly` cookies, so JavaScript cannot read the credential and XSS cannot exfiltrate it
- Timing-attack defence: a login for an unknown email still runs a bcrypt comparison, so response time cannot be used to discover which addresses are registered
- Rate limiting on auth routes, `helmet` security headers, and a CORS allowlist that never uses a wildcard alongside credentials

### Pantry

Full CRUD over ingredients with quantities, units and expiry dates.

- Ownership is enforced in the SQL `WHERE` clause rather than checked after the fetch, so another user's row is structurally unreachable
- "Missing", "malformed id" and "belongs to someone else" all return an identical 404, so responses cannot be used to probe for what exists
- Expiry is stored as a `DATE` and returned as a plain `YYYY-MM-DD` string, avoiding the off-by-one-day class of timezone bug

### Household Profile

Onboarding captures only what the meal planner consumes.

- Household is split into adults, teenagers, children and toddlers, because each band changes the plan differently — teenagers eat more than adults, toddlers need mild and choke-safe food
- Dietary presets such as Halal tick ingredient exclusions rather than storing a diet label, so the database records what someone does not eat instead of what they believe
- Cuisines come from a closed list because they have to match recipe tags for retrieval; avoided ingredients are free text because allergies cannot be enumerated in advance

### AI Meal Plan Generation

- Output shape is enforced by the OpenAI API through a JSON schema derived from Zod, so malformed JSON is not a failure mode
- Plans are built from the user's real profile and current pantry contents, with items expiring soonest listed first
- Avoided ingredients get three layers of defence: the system prompt, a restatement in the user message, and a **programmatic scan of every dish name and ingredient after generation**. Only the third is a guarantee — a prompt is a request, and some of these are allergies
- A violation triggers one retry that names the specific dish and ingredient, because repeating a rule the model already broke does not help
- Every call is recorded in `ai_usage` — including failures and retries, since both cost money — while only the attempt that produced a usable plan counts against the monthly quota

### Testing

110 integration tests running against a dedicated Neon database branch, covering the HTTP layer, the service layer and both repositories. Notable cases include cross-user isolation, expired-session rejection, and a regression test for the DATE timezone bug.

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

# Comma-separated browser origins allowed to send credentialed requests
CORS_ORIGINS=http://localhost:5173

# Optional. Must exist in MODEL_PRICING in services/openai.ts
OPENAI_MODEL=gpt-5.6-luna
```

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
| Planned: mobile | SwiftUI |
| Planned: AI vision | OpenAI Vision |
| Planned: vector search | pgvector |
| Planned: deployment | Vercel (web) + VPS or Render (API) |

---

# ⚠️ Known Gaps

Written down deliberately — an honest list is more useful than a clean one.

- **No email verification.** Any address can be registered without proving ownership
- **No password reset.** The forgot-password screen is not wired to anything; a real flow needs single-use expiring tokens and an email provider
- **No account lockout.** Rate limiting is per-IP, so a distributed attack against one account is not slowed
- **Rate limiting is not covered by tests**, because the suite raises the limits to run at all. It is verified by hand
- **Not deployed yet.** Production cookie behaviour (`Secure`, `SameSite`) and CORS under real domains are untested
- **Not bilingual yet.** The interface is English-only; Simplified Chinese is planned but no i18n layer exists
- **Estimated costs are model guesses**, not real supermarket prices

---

# 🚀 Roadmap

## MVP 0.5 — React Web Application *(in progress)*

- [x] Session authentication
- [x] Pantry inventory CRUD
- [x] Household profile and onboarding
- [x] AI meal planning from real profile and pantry data
- [x] Usage and cost tracking, monthly quota
- [ ] Shopping list generated from the meal plan
- [ ] Expiry alerts from real pantry data
- [ ] Dashboard wired to live data
- [ ] Deployment
- [ ] English + Simplified Chinese interface

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

Mosaic Kitchen is intended to ship in English and Simplified Chinese, with Japanese, Korean, Arabic and Hindi as later possibilities.

No i18n layer exists yet. When it lands, the groundwork is already in place: the database stores machine-readable values (`cultural-authenticity`, `vegetables`) and the interface maps them to display labels in one file, so translation touches that file rather than the schema.

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
