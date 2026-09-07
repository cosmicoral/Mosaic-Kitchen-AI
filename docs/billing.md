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
| Monthly | £0 | £7.99 | £12.99 |
| Yearly | £0 | £89.99 | £129.99 |
| Household members | 1 | 2 | 6 |
| Meal plans / month | 2 | 10 | 30 |
| Meals per plan | 7 | 14 | 21 |
| Cook-from-pantry / month | 3 | 30 | 100 |
| Plan translations / month | 2 | 20 | 60 |
| Camera scans / month | — | 30 *(iOS app)* | 150 *(iOS app)* |

Camera scanning has quota plumbing but no feature behind it, so it is marked as belonging to a future iOS version rather than sold as available. The free allowance is **zero**, not one: a scan costs nothing today either way, which is precisely why the number should not be left as a standing instruction to start spending on the day the app ships.

The allowances are a decision made against `services/costModel.ts`, which holds the token shape of every AI call and is read by a test. If a quota moves or a prompt grows, that test fails and the decision gets made again rather than going stale.

Worst case — every allowance used to the last one:

| | AI cost / month | Revenue | Share |
| --- | --- | --- | --- |
| Free | £0.016 | £0 | £100 cap reached at ~6,300 users |
| Plus | £0.14 | £7.99 | 1.7% |
| Pro | £0.46 | £12.99 | 3.5% |

**The free tier is sized against an absolute budget: 500 free accounts for under £200 a year**, which is £0.033 per account per month. Six plans came to £0.0342 — £205 a year, over the line by a margin small enough that nothing would have reported it before the invoice did. The current numbers come to **£0.0158**, about £95 a year for 500 accounts.

Two plans is deliberately not a habit-forming quantity. The free tier exists to show somebody that the planner understands their kitchen — enough to see a week of dinners that respect a halal restriction and a Sichuan preference — not to feed them indefinitely. Pantry cooks are held at three rather than cut to match, because they cost a third of a plan and they are the one feature that directly stops food being thrown away.

The paid tiers were **not** cut to fund it. A Plus account using every allowance costs fourteen pence of AI against £7.99 of revenue; trimming that would save fractions of a penny and cost a paying customer something they can feel. Their translation numbers are a bound on a runaway loop, not a ration.

### The second ceiling

Request counts bound how often an account asks, not what the asking costs. `config/aiBudget.ts` holds a per-account monthly spend band — target, soft cap, hard cap, all configurable through `FREE_AI_COST_*_GBP` and `PAID_AI_COST_*_GBP`. Crossing the soft cap degrades (shorter do-not-repeat list, one generation attempt, card-scope translation); crossing the hard cap refuses. Degrading never touches the allergen or cuisine post-checks, and no cost figure is ever shown to a user.

Allowances reset on the calendar month, `date_trunc('month', now())`, identically for free and paid accounts. Not the Stripe billing anniversary: free accounts have no billing cycle at all, and a per-account boundary would need a subscription lookup to compute and could disagree with itself.

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
