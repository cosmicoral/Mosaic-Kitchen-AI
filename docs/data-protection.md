# Data protection

A record of what personal data this application processes, why, where it goes, and on what lawful basis.

Written because UK GDPR Article 30 requires it. The usual exemption for organisations under 250 people **does not apply here**: it lapses when processing is not occasional, or when it includes special category data. This app does both.

Nothing here is legal advice. It is a factual description of what the code does, written so that someone qualified can review it against the law rather than against a guess.

---

## 1. What is collected

Derived from the migrations, not from memory. Every column that holds personal data is listed.

| Table | Field | What it is |
| --- | --- | --- |
| `users` | `email` | Identifier and contact |
| | `password_hash` | bcrypt, cost 12. Not reversible |
| | `avatar_key` | Object key for an uploaded photo |
| `user_identities` | `provider`, `sub` | Google account identifier |
| `sessions` | `id`, `expires_at` | Login session |
| `user_profiles` | `adults`, `teenagers`, `children`, `toddlers` | **Household composition, including children** |
| | `avoid_ingredients` | **Allergies and intolerances → health data** |
| | `low_salt`, `low_sugar`, `nutrition_focus` | **Dietary health requirements → health data** |
| | `cuisines`, `cuisine_substyles` | Food preferences. Combined with halal or kosher exclusions, **can reveal religious belief** |
| | `weekly_budget` | Household finances |
| | `postcode` | Location. **See §5 — collected, never used** |
| | `note` | Free text the user writes |
| `pantry_items` | `name`, `quantity`, `expiry_date` | What is in someone's kitchen |
| `shopping_list_items` | `name`, `quantity` | What they are about to buy |
| `meal_plans` | `plan` (JSONB) | Generated plans, derived from all of the above |
| `subscriptions` | `stripe_customer_id`, `status` | Billing relationship |
| `ai_usage` | `user_id`, `cost_usd`, `feature` | Per-account model spend |

### The part that changes the legal position

**Three of these are special category data under Article 9**, and it is not a technicality — it is the product's whole premise. A meal planner that knows you avoid pork, avoid dairy, and cook Levantine food has inferred something about your religion and your health, whether or not anyone typed those words.

| Field | Article 9 category |
| --- | --- |
| `avoid_ingredients` | Health (allergies, intolerances, coeliac) |
| `low_salt`, `low_sugar`, `nutrition_focus` | Health (managed conditions) |
| `cuisines` + religious exclusions | Religious or philosophical belief |

Article 9 processing is **prohibited by default**. The only realistic exemption here is **Article 9(2)(a): explicit consent** — which means a specific, affirmative, separately recorded act, not a pre-ticked box and not "by using this service you agree".

---

## 2. Lawful basis

| Purpose | Article 6 basis | Article 9 basis |
| --- | --- | --- |
| Account, login, session | Contract | — |
| Generating meal plans from a profile | Contract | **Explicit consent** |
| Pantry, shopping list, expiry alerts | Contract | **Explicit consent** (pantry contents can imply the same things) |
| Taking payment | Contract / legal obligation | — |
| Metering AI spend per account | Legitimate interests — preventing abuse and staying solvent | — |
| Session cleanup, security logging | Legitimate interests | — |

---

## 3. Where the data goes

| Recipient | What they get | Where |
| --- | --- | --- |
| Neon | Everything in §1 | **London (`eu-west-2`)** — UK, no transfer |
| OpenAI | Household composition, dietary restrictions, pantry contents, budget. **No email, no user id, no postcode** — see below | United States |
| Stripe | Email, billing address, card details (never touch our servers) | US / Ireland |
| Cloudflare R2 | Avatar images | Set the bucket's jurisdiction |
| Google | OAuth identifier, for users who sign in that way | United States |
| Vercel / the API host | Request metadata, IP addresses | — |

### The prompt is pseudonymous, and that was deliberate

Verified against `utils/promptBuilder.ts`: the model receives dietary and household information but **never the email address, the user id, or the postcode**. Nothing in a prompt identifies a person by itself.

This does not remove the data from GDPR's scope — pseudonymous data is still personal data — but it materially reduces what a breach at the processor would expose. It is worth stating in the privacy notice, and worth not quietly breaking later.

### Transfers outside the UK

OpenAI, Stripe and Google are US processors. Each needs a transfer mechanism — in practice their standard DPA incorporating the UK International Data Transfer Addendum. **These have to be actually accepted in each provider's dashboard, not assumed.**

---

## 4. What the application already does correctly

Worth recording, because it is most of the technical work and it is already built.

- **Article 15 / 20 — access and portability.** `accountService.exportData` returns the account, profile, pantry, shopping list and meal plans as JSON. Credentials are excluded, correctly: a password hash is not data the person needs back.
- **Article 17 — erasure.** `deleteAccount` cancels the Stripe subscription first (so a deleted account cannot keep being charged), removes the avatar from object storage, then deletes the user row. `ON DELETE CASCADE` takes the rest. There is no soft delete to walk back from.
- **Article 16 — rectification.** The profile is editable in full.
- **Article 32 — security.** bcrypt cost 12, `HttpOnly` session cookies, `SameSite=Lax`, per-route rate limiting, parameterised SQL throughout, EXIF and GPS stripped from uploaded avatars by re-encoding.
- **Data minimisation in the prompt**, as above.

---

## 5. Gaps

### 5.1 `postcode` is collected and never used

`grep` finds it in validation, the type definition and the repository — and **nowhere else**. It is not in any prompt, any query, or any feature.

Article 5(1)(c) says collect only what is necessary for the stated purpose. A postcode stored against a future intention has no stated purpose, and a postcode is a small area — combined with household composition it is meaningfully identifying.

**Fix: drop the column and the field.** If regional grocery availability later needs a location, ask for it then, for that stated reason. Keeping it costs nothing today and is indefensible if anyone asks why it is there.

### 5.2 No explicit consent for special category data

The profile form collects health and belief-revealing data with no consent step. Article 9(2)(a) needs an affirmative, specific, recorded act.

**Fix:** a separate checkbox at the point of collection, unticked by default, with its own wording — not folded into "I accept the terms". Record when it was given, because consent you cannot evidence is consent you do not have. It must also be withdrawable, which in practice means deleting the profile.

### 5.3 No privacy notice, no terms of service

`find web/src -iname "*privacy*" -o -iname "*term*"` returns nothing. Articles 13 and 14 require the notice to be given at the point of collection. The terms are also the vehicle for the consumer-cancellation waiver described in `deploy-runbook.md` §0.

### 5.4 No retention policy

Sessions are cleaned up by `cleanup:sessions`. Nothing else is. Meal plans, pantry history and `ai_usage` rows accumulate for the life of the account with no stated period, which Article 5(1)(e) does not permit.

**Fix:** state a period and enforce it. A defensible starting point: meal plans and pantry history for 24 months after last activity, `ai_usage` for 24 months (it is needed for cost analysis and abuse detection), everything on account deletion.

### 5.5 Not registered with the ICO

Most UK controllers processing personal data electronically must pay the ICO's annual data protection fee. For a sole trader or micro organisation this is **tier 1, about £40 a year**. Registering is a short online form.

Confirm the current tier and whether any exemption applies at ico.org.uk — the amount and the bands change.

### 5.6 No breach procedure

Article 33 gives 72 hours to report a qualifying breach to the ICO. Deciding what to do during one is not a plan.

---

## 6. What to do, in order

| | Action | Where |
| --- | --- | --- |
| 1 | ~~Drop `postcode`~~ **done** — migration `1790200000000`, plus backend types, repository, validation, frontend types, onboarding and profile pages | |
| 2 | ~~Explicit Article 9 consent~~ **done** — `data_consent_at` + `data_consent_version`, separate unticked checkbox, refused server-side with `CONSENT_REQUIRED` | |
| 3 | Write the privacy notice and publish it. **The consent checkbox already links to `/privacy`, and that route does not exist yet** | New page, linked in the footer and at sign-up |
| 4 | Write the terms, including the cancellation waiver | New page, plus `consent_collection.terms_of_service` in Checkout |
| 5 | Accept the DPAs in the OpenAI, Stripe and Google dashboards | External |
| 6 | Set the R2 bucket jurisdiction | External |
| 7 | Register with the ICO and pay the fee | External |
| 8 | Add retention cleanup alongside `cleanup:sessions` | New script + cron |
| 9 | Include `subscriptions` and `ai_usage` in the data export | `accountService.exportData` |

Items 1–4 and 8–9 are code. Items 5–7 are forms someone has to fill in.

**None of this blocks deploying in Stripe test mode.** All of it blocks charging a real person real money.
