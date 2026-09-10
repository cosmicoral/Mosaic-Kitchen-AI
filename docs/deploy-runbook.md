# Deploy runbook

`deployment.md` is the plan and the reasoning. This is the keystrokes, in order, from nothing to live.

Written against the real names this deployment uses:

```
mosaickitchen.gethenfieldlabs.com       frontend, on Vercel
mosaic-api.gethenfieldlabs.com   API, on a Hetzner VPS
```

Both sit under `gethenfieldlabs.com`, which is what makes the session cookie work: same registrable domain means same-site, so `SameSite=Lax` holds and the CSRF protection that `None` discards is kept.

`mosaic-api.` rather than `api.mosaic.` on purpose — a fourth-level name gives certbot and some DNS panels avoidable trouble for no benefit.

Costs are approximate and worth checking rather than trusting.

---

## 0. What live mode actually commits you to

Test mode is a demo. Live mode is a business, and three obligations arrive with it. None is a reason not to do it; all three are easier to handle before the first payment than after.

**Stripe will verify who you are.** Photo ID, address, and a UK bank account in the same name. Approval usually takes a day or two and can ask for more. Start this first — everything at step 9 is blocked on it, and it is the only step with someone else's queue in it.

**HMRC.** Trading income over £1,000 in a tax year means registering as a sole trader and filing a Self Assessment. VAT registration is compulsory only above £90,000 of taxable turnover; below that it is optional, and `costModel.ts` already models both sides of that line.

**The 14-day cancellation right.** Under the Consumer Contracts Regulations a UK consumer buying a digital service can cancel within 14 days — *unless* they expressly consent to it starting immediately and acknowledge that they lose the right by doing so. This app grants Plus the moment checkout succeeds, and Stripe Checkout does not collect that acknowledgement by default. Either add a `consent_collection` / custom checkbox at checkout, or plan on honouring 14-day refunds. **This is a real gap in the current build, not a formality.**

I am not a lawyer or an accountant, and the thresholds above are external facts that change. Confirm them with HMRC and, for the consumer-rights point, with someone qualified before taking money.

---

## 1. Domain — already done

`gethenfieldlabs.com` exists and serves the studio site. Mosaic Kitchen goes on two subdomains of it rather than a new registration: it costs nothing, it is available now, and it keeps the cookie same-site.

A product domain (`mosaickitchen.com`, the way JunoGuard has its own) can be added later and pointed at the same deployment. That is presentation, not infrastructure, and it does not block anything.

**What is needed here:** find out where DNS for `gethenfieldlabs.com` is managed — the registrar, Cloudflare, or Vercel. Step 3 adds records there.

---

## 2. VPS — 20 minutes, ~€4–6/month

Hetzner Cloud, smallest shared-vCPU instance (CX-series, 2 vCPU / 4 GB). Ubuntu 24.04 LTS. **Location: Falkenstein, Nuremberg or Helsinki** — the Neon database is already in `eu-west-2` (London), so staying in Europe keeps the round trip short.

Add your SSH public key **in the create-server dialog**, not afterwards. A box that ever accepted a root password has been scanned before you finish reading this sentence.

Then, as root:

```bash
adduser mosaic && usermod -aG sudo mosaic
rsync --archive --chown=mosaic:mosaic ~/.ssh /home/mosaic

# Password auth off, root login off.
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
apt update && apt upgrade -y
apt install -y unattended-upgrades fail2ban
```

**Open a second terminal and confirm `ssh mosaic@<ip>` works before closing the first one.** Locking yourself out of a fresh box is recoverable through the console; it is still an hour you did not need to spend.

---

## 3. DNS

| Record | Name | Value |
| --- | --- | --- |
| A | `mosaic-api` | the VPS IPv4 |
| CNAME | `mosaickitchen` | given to you by Vercel at step 7 |

The apex record for the studio site is untouched — these are two new names beside it.

**If DNS is on Cloudflare, set `mosaic-api` to "DNS only" — the grey cloud, not the orange one.** Two reasons, both of which produce confusing symptoms rather than errors:

- The proxy buffers responses, and generation streams over SSE. Buffered, the progress stages arrive in one lump at the end, which looks exactly like the streaming feature being broken.
- Certbot's HTTP-01 challenge validates against the real host. Behind the proxy it fails on something that reads like a DNS problem.

Wait for `dig mosaic-api.gethenfieldlabs.com +short` to return your IP before step 6.

---

## 4. Node 24

Ubuntu 24.04 ships Node 18. The backend runs TypeScript directly through native type stripping and its `engines` field demands `>=24.0.0`, so this is not optional.

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # must be v24 or higher
```

---

## 5. The application

```bash
sudo mkdir -p /srv/mosaic && sudo chown mosaic:mosaic /srv/mosaic
cd /srv/mosaic
git clone https://github.com/cosmicoral/Mosaic-Kitchen-AI.git .
cd backend
npm ci --omit=dev        # no build step; TypeScript is not needed at runtime
```

Write `/srv/mosaic/backend/.env`. Start from `.env.example` and change these:

```env
NODE_ENV=production
PORT=3000

APP_URL=https://mosaickitchen.gethenfieldlabs.com
API_ORIGIN=https://mosaic-api.gethenfieldlabs.com
CORS_ORIGINS=https://mosaickitchen.gethenfieldlabs.com

# Leave unset. app. and api. are the same registrable domain, so they are
# same-site and Lax works — which keeps the CSRF protection that None discards.
COOKIE_SAMESITE=

DATABASE_URL=postgresql://...?sslmode=verify-full
OPENAI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

FREE_TIER_MONTHLY_SPEND_CAP_GBP=100
FREE_AI_COST_TARGET_GBP=0.025
FREE_AI_COST_SOFT_CAP_GBP=0.03
FREE_AI_COST_HARD_CAP_GBP=0.05
```

Stripe values come at step 9. Then:

```bash
chmod 600 .env
npm run migrate:up
```

R2 is optional for launch — with the four `R2_*` variables unset, avatars fall back to disk and are served from `/uploads`. Configure it when you would rather not have user uploads on the same box as the app.

### systemd

`/etc/systemd/system/mosaic-api.service`:

```ini
[Unit]
Description=Mosaic Kitchen API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mosaic
WorkingDirectory=/srv/mosaic/backend
ExecStart=/usr/bin/node src/server.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# The app needs to write nothing outside its own directory.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/mosaic/backend/.uploads

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mosaic-api
systemctl status mosaic-api
journalctl -u mosaic-api -n 50
```

There is **no health endpoint**. `/api/health` does not exist, so there is nothing to curl and nothing for an uptime monitor to poll — "is it up" currently means reading the journal. Not a blocker for launch, and worth adding before you rely on being told when it falls over rather than finding out.

### Session cleanup on a cron

```bash
sudo crontab -u mosaic -e
# 15 4 * * *  cd /srv/mosaic/backend && /usr/bin/npm run cleanup:sessions >> /var/log/mosaic-cleanup.log 2>&1
```

---

## 6. nginx and TLS

```bash
sudo apt install -y nginx
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot
```

`/etc/nginx/sites-available/mosaic`:

```nginx
server {
    listen 80;
    server_name mosaic-api.gethenfieldlabs.com;

    client_max_body_size 6m;   # avatar uploads

    # The two streaming routes. Generation runs for thirty seconds or more and
    # nginx buffers proxied responses by default — with buffering on, every
    # progress stage arrives at once at the end, which is indistinguishable
    # from the feature being broken.
    #
    # The backend also sends X-Accel-Buffering: no, which nginx honours. Both
    # are here so the behaviour does not depend on one header surviving a
    # future edit.
    location = /api/meal-plan/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /api/meal-plan/pantry-cook/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`X-Forwarded-Proto` matters: `trust proxy` and the `Secure` cookie flag key off it. Without it the app believes it is on plain HTTP and issues cookies a browser will refuse to send back.

```bash
sudo ln -s /etc/nginx/sites-available/mosaic /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d mosaic-api.gethenfieldlabs.com
systemctl list-timers | grep certbot     # renewal is automatic; confirm it exists
```

---

## 7. Frontend on Vercel

Import the repo at vercel.com.

| Setting | Value |
| --- | --- |
| Root directory | `web` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Env var | `VITE_API_URL = https://mosaic-api.gethenfieldlabs.com` |

Then add `mosaickitchen.gethenfieldlabs.com` under the project's Domains tab and create the CNAME it gives you.

### `web/vercel.json` is not optional

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

This is a single-page app: React Router resolves `/dashboard` in the browser, and nothing is ever built to that path on disk. Without the rewrite, Vercel looks for a file called `dashboard`, does not find one, and returns its own `404: NOT_FOUND` page.

It bit on the first real login. Google OAuth completed correctly, redirected to `/dashboard`, and the app appeared to be broken — the failure looked like an authentication problem and was not one. Every deep link, every refresh on a page other than the root, and every OAuth return would have done the same.

The rewrite sends all paths to `index.html` so the router can do its job. API calls are unaffected: they go to `mosaic-api.gethenfieldlabs.com`, a different host entirely.

**Do not stop at the `*.vercel.app` URL.** That is a different registrable domain from `mosaic-api.gethenfieldlabs.com`, which makes the session cookie cross-site — you would have to set `COOKIE_SAMESITE=none` and give up the CSRF protection. The custom subdomain is the fix, not the workaround.

---

## 8. Google OAuth

Google Cloud Console → Credentials → your OAuth client → Authorised redirect URIs, add:

```
https://mosaic-api.gethenfieldlabs.com/api/auth/google/callback
```

Byte for byte. OAuth fails closed on an unregistered URI, and the error names `redirect_uri_mismatch` without telling you which character is wrong.

---

## 9. Stripe, live mode

Activate the account first (step 0) — the rest is blocked on it.

**Create four live prices.** Toggle the dashboard out of test mode, then Products → create the two products and their prices:

| Product | Price | Interval |
| --- | --- | --- |
| Plus | £7.99 | monthly |
| Plus | £89.99 | yearly |
| Pro | £12.99 | monthly |
| Pro | £129.99 | yearly |

Prices are immutable. Getting an amount wrong means creating another one and leaving the mistake in the list forever, so check them against `web/src/lib/plans.ts` before saving — a test asserts those numbers against the entitlements, so the file is the authority.

Copy the four `price_...` ids into `.env`. **Test-mode ids do not exist in live mode**; pasting the old ones resolves every plan to the free tier, which fails quietly in the safe direction and is confusing for exactly that reason.

**Webhook.** Developers → Webhooks → Add endpoint:

```
https://mosaic-api.gethenfieldlabs.com/api/stripe/webhook
```

Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

Take the endpoint's **signing secret** — `whsec_...` from this endpoint, not the one `stripe listen` printed locally — into `STRIPE_WEBHOOK_SECRET`.

**Customer Portal.** Settings → Billing → Customer portal: turn it on and allow cancellation, or the cancel button in the app leads nowhere.

```bash
sudo systemctl restart mosaic-api
```

---

## 10. Verify against production

Everything above has only ever run on localhost.

| # | Check | Watch for |
| --- | --- | --- |
| 1 | Sign up, log out, log back in | The session cookie surviving is the whole `SameSite`/`Secure` question answered |
| 2 | Sign in with Google | `redirect_uri_mismatch` means step 8 |
| 3 | Generate a plan | Progress stages arriving **one at a time**. All at once = buffering, step 3 or 6 |
| 4 | Generate a third plan on a free account | Refused with the quota message, not a 500 |
| 5 | Open an English pantry holding a Chinese ingredient | Gloss appears; `ai_usage` gains an `ingredient-gloss` row |
| 6 | Subscribe with a **real card** | Tier becomes Plus. This charges you actual money — refund it from the dashboard afterwards |
| 7 | Check `stripe_events` | The event id is recorded |
| 8 | Cancel through the Customer Portal | Status changes; access persists to period end |
| 9 | Upload an avatar | Appears, and is not 6 MB |

```sql
select feature, succeeded, cost_usd, created_at
  from ai_usage order by created_at desc limit 10;
```

---

## 11. Once it is up

- `journalctl -u mosaic-api -f` for the first day
- Grep the logs for `Free-tier AI spend at` — it warns at 80% of the monthly cap
- Grep for `URGENT: could not cancel Stripe subscription` — that means an account was deleted while Stripe was unreachable and a card is still being charged
- Rehearse a Neon restore once. A backup nobody has restored is an assumption

### Deploying a change

```bash
cd /srv/mosaic && git pull
cd backend && npm ci --omit=dev && npm run migrate:up
sudo systemctl restart mosaic-api
```

The frontend redeploys itself when you push, once Vercel is connected to the repo.

---

## Still blocked after this

Now unblocked by having a domain, but not built:

- **Password reset** — needs an email provider sending from a verified domain
- **Change email** — same
- **Sign in with Apple** — needs a paid Apple Developer account plus domain verification

Worth knowing before launch: a user who forgets their password currently has no self-service way back in.
