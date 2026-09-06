# Billing

Stripe hosted Checkout and the Customer Portal, so no card data ever reaches
this codebase and no PCI surface is created.

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

---

## Webhook handling

Three properties, each with a specific failure it prevents.

| Property | Implementation | Failure it prevents |
| --- | --- | --- |
| Signature verification | Raw body, on a route mounted **before** `express.json()` | A parsed and re-serialised body no longer matches the signature, so verification fails for every event |
| Idempotency | Each event id recorded in `stripe_events` before it is acted on | Stripe redelivers on any non-2xx, and applying the same upgrade twice is a real charge dispute |
| Re-fetch, do not trust | Subscription state read back from the Stripe API rather than taken from the event payload | Events arrive late and out of order; the payload is a snapshot of a moment that may already have passed |

An unrecognised price id resolves to the **free** tier. Failures should cost
the business, not hand out entitlements: a misconfiguration then under-serves
a paying customer, who complains, rather than silently giving everyone Pro,
which nobody reports.

`past_due` still counts as entitled. Stripe retries a failed card for about
two weeks, and most failures are an expired card rather than a refusal to pay
— cutting service off on the first one turns a billing hiccup into a
cancellation.

---

## Deletion and Stripe

Account deletion cancels the subscription **before** deleting the user row.
The delete cascades the subscription record away, so doing it in the other
order would leave no stored subscription id to cancel — the account would be
gone and the card would keep being charged every month with nothing left to
explain why.

If Stripe is unreachable the account is still deleted and the failure is
logged as `URGENT`. Holding a legal right hostage to a third party's uptime
is the worse of the two options; a subscription cancelled by hand the next
morning is the better one.

---

## Pricing copy is tested

`tests/pricingCopy.test.ts` reads the frontend's plan copy as text and checks
every number in it against the entitlements the API enforces. The pricing page
has disagreed with the code twice — it advertised two free meal plans when the
API allowed eight, and six when it had gone back to eight — and both were
found by a person reading a screen. A number in a sales page that the server
does not honour costs trust rather than time.
