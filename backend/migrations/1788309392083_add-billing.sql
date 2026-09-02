-- Up Migration

ALTER TABLE users ADD COLUMN stripe_customer_id TEXT UNIQUE;

CREATE TABLE subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id        TEXT NOT NULL,

  -- Stripe's own vocabulary, stored verbatim. Translating it into our own
  -- states would mean maintaining a mapping that drifts every time Stripe adds
  -- one, and the failure mode of a stale mapping is billing someone wrongly.
  status                 TEXT NOT NULL,

  current_period_end     TIMESTAMPTZ NOT NULL,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_user_id_idx ON subscriptions (user_id);

-- Stripe delivers each webhook at least once and retries for up to three days,
-- so the same event will arrive twice sooner or later. Recording the ids we
-- have already handled is what turns a duplicate into a no-op instead of a
-- double upgrade.
CREATE TABLE stripe_events (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE stripe_events;
DROP TABLE subscriptions;
ALTER TABLE users DROP COLUMN stripe_customer_id;