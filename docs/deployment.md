# Deployment

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
| 10 | Create the four **live** prices in Stripe — £7.99, £89.99, £12.99, £129.99 — and put their ids in the environment | Stripe prices are immutable. The test-mode ids do not exist in live mode, and the amounts changed after the unit economics were worked out |
| 11 | Point the Stripe webhook at `api.<domain>`, take the **live** signing secret | The test-mode secret does not verify live events |
| 12 | Verify end to end against production: sign in, generate, checkout, cancel | Everything above has only ever been exercised on localhost |

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
