# Pre-deploy verification

Things that only break when the pieces are put together, and that no test in this repo can catch.

The suite is 267 green, but every one of those tests either stubs the model or never leaves the process. Three areas have therefore never actually run: **OAuth round trips**, **Stripe's webhook path**, and **the free-tier changes against a real model call**. This is the list for exercising them on localhost, where a mistake costs a minute rather than a customer.

Work top to bottom. Tick as you go.

---

## A. The free-tier changes, against a real model

These shipped with source-reading tests, which prove the code is *shaped* right. None of them has spent an actual penny yet.

| # | Do | Expect |
| --- | --- | --- |
| A1 | Sign up a fresh free account, generate one plan | Plan appears. `ai_usage` has one `meal-plan` row, `succeeded = true` |
| A2 | Generate a second, then a third | The third is refused with "You have used your 2 free plans this month" — **not** a 500 |
| A3 | Set `meals_per_week` to 21 in the profile editor, generate | The plan comes back with **7 meals, not 21**. Server log shows `Capping a plan for user … from 21 meals to 7` |
| A4 | Switch the interface to English, open a pantry holding a Chinese ingredient name the lexicon does not know | The English gloss appears underneath. `ai_usage` gains an **`ingredient-gloss`** row |
| A5 | Reload that same page | **No new `ai_usage` row.** The second read is served from `ingredient_glosses` and must be free |

```sql
-- After each step:
select feature, succeeded, cost_usd, created_at
  from ai_usage order by created_at desc limit 5;
```

A4 is the one that matters most. It is the first time the `ingredient-gloss` key has ever been written, the migration widening the CHECK constraint landed only just now, and the failure mode is silent — `recordUsage` swallows its own errors, so a rejected INSERT shows up as a `console.error` and nothing else. **If no row appears, the metering is not working**, however normal the page looks.

---

## B. Stripe, end to end

Never exercised once, in any mode.

| # | Do | Expect |
| --- | --- | --- |
| B1 | `stripe listen --forward-to localhost:3000/api/stripe/webhook`, put the printed `whsec_…` in `.env`, restart | CLI reports a connection |
| B2 | Check out Plus monthly with card `4242 4242 4242 4242` | Redirect back to the app; tier becomes `plus` |
| B3 | Look at the `stripe_events` table | The event id is recorded |
| B4 | `stripe events resend <event_id>` | Tier unchanged, **no duplicate row**. This is the idempotency guard doing its job |
| B5 | Generate a plan on the new Plus account | Allowance is 10, not 2 |
| B6 | Cancel through the Customer Portal | Status becomes `cancelled`; entitlements stay until the period end |
| B7 | Stop the CLI, hit the webhook URL with a bogus signature | 400, and nothing written |

B7 is worth doing deliberately. The raw-body mounting order is the kind of thing that works until someone moves a line, and a webhook that accepts unsigned events is a webhook anyone can post to.

---

## C. Google sign-in

| # | Do | Expect |
| --- | --- | --- |
| C1 | Sign in with Google on a brand-new email | Account created, session cookie set, `user_identities` row keyed on `(provider, sub)` |
| C2 | Sign out, sign in again with the same Google account | **Same** user id — not a second account |
| C3 | Sign up with email/password first, then Google with that same address | Whatever the intended behaviour is, confirm it is deliberate and not an accident |

C3 has no test and no obvious right answer. Decide it now rather than discovering it from a user who has two accounts.

---

## D. Streaming

| # | Do | Expect |
| --- | --- | --- |
| D1 | Generate a plan and watch the progress stages | Stages arrive **one at a time**, not all at once at the end |

Only the application layer can be checked here. The nginx `proxy_buffering off` half cannot be verified until step 5 of `deployment.md`, and if it is missed the symptom is exactly this test passing locally and failing in production.

---

## E. Configuration

| # | Do | Expect |
| --- | --- | --- |
| E1 | Run `npm --prefix backend run migrate:up` against the deployment database | Migration `1790200000000_add-plan-repair-usage.sql` is applied; `ai_usage_feature_valid` accepts `plan-repair` |
| E2 | Switch an old mixed-language plan between English and Chinese, then inspect `ai_usage` | The page contains one language and a successful `plan-repair` row is recorded; reloading uses the cache without a new row |
| E3 | ~~`sslmode=require` → `verify-full`~~ **done** — re-run `npm test` | Still 267 green. The driver already behaved this way, so a failure here would mean something else |
| E4 | Confirm the six `*_AI_COST_*_GBP` variables are present in `.env`, or accept the defaults in `config/aiBudget.ts` knowingly | — |

On E3: `require` was already being treated as `verify-full` by the driver, but reverts to libpq semantics — encrypt, do not validate the certificate — in pg v9. Writing `verify-full` explicitly pins today's behaviour so a routine dependency upgrade cannot silently weaken the database connection. Because it is a no-op today, the test suite passing is the whole verification.

---

## What this does not cover

Named so the gap is on the record rather than assumed away:

- **Production cookies.** `Secure` and `SameSite` behave differently over HTTPS on a real domain. Cannot be tested on localhost at all
- **CORS against the real origin.** Only `localhost:5173` has ever been in `CORS_ORIGINS`
- **Live-mode Stripe.** Prices are immutable and test-mode ids do not exist in live mode, so B2–B7 will need repeating once the four live prices exist
- **nginx buffering**, per D1
- **Vision scans.** The feature does not exist; the free allowance is 0 and there is nothing to verify
