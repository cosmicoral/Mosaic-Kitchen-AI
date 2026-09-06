# Architecture

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

---

## Request path, end to end

A weekly plan generation, from click to stored row:

1. `POST /api/meal-plan/stream` — `requireAuth` resolves the session cookie
   against `sessions`, then a per-user rate limiter
2. Controller opens an SSE response, sets `X-Accel-Buffering: no`, and writes a
   priming comment so proxies flush
3. Service checks the tier, the per-user quota and the global free-tier spend
   ceiling **before** spending money on a model call
4. Insights measured from the profile and pantry stream out — real values,
   known before the model has answered
5. Model call with the per-user Zod schema; the parsed plan goes through the
   allergen, cuisine, meal-count, arithmetic, budget and language checks
6. A failure names the specific dish and triggers exactly one retry
7. Usage recorded in `ai_usage` whether or not the plan was usable, because
   both cost money; only a usable plan consumes the quota
8. Plan stored as JSONB with the profile snapshot and the generation locale

---

## Testing strategy

| Kind | Where | What it covers |
| --- | --- | --- |
| Integration | `backend/tests/*.test.ts` against a dedicated Neon branch | Cross-user isolation, expired sessions, password policy, quota accounting |
| Pure unit | Same suite, no database | Budget arithmetic, language compliance, translation safety, entitlements, the ingredient lexicon |
| Source-reading | Same suite | Checks that code and SQL agree — see below |
| Frontend | `web/src`, Vitest | Locale context, onboarding state, hooks, formatting |
| Lint-style | `web/scripts/check-locale-coverage.mjs` | Every string shown in Chinese mode has a translation |

Three tests read source rather than exercising behaviour, because the bugs
they catch live in the gap between two files that TypeScript cannot see
across:

- `profileUpsert.test.ts` — every column in the profile `INSERT` also appears
  in the `ON CONFLICT DO UPDATE SET` list. Two preference fields had been
  saving on create and silently ignoring updates
- `aiUsageFeatures.test.ts` — every `ai_usage` feature key used in code is
  permitted by the `CHECK` constraint in the migrations. A key added in code
  but not in the constraint made every cook-from-pantry request fail **after**
  a paid model call
- `pricingCopy.test.ts` — every number on the pricing page matches the
  entitlements the API enforces
