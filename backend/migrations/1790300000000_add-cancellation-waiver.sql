-- Up Migration

-- Evidence that the customer gave up the statutory 14-day cancellation right
-- before the subscription started.
--
-- Its own table rather than a column on `subscriptions`, for three reasons.
--
-- The row has to exist BEFORE the subscription does. The waiver is collected
-- when checkout opens; the subscription row is written later, by the webhook,
-- and only if payment succeeds. A column on `subscriptions` could only be
-- filled in after the fact, which is the one moment at which the evidence is
-- worthless — the whole legal point is that the acknowledgement preceded
-- performance.
--
-- Abandoned checkouts leave a row too, and that is correct: it records that we
-- asked and what we showed, for a customer who then did not pay. A column
-- would silently lose those.
--
-- And a customer can subscribe, cancel and subscribe again. Each attempt needs
-- its own acknowledgement; the history is the audit trail.
CREATE TABLE cancellation_waivers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Which plan they were buying when they agreed. A waiver given for a £4.99
  -- monthly plan is not evidence about a £49 annual one.
  stripe_price_id   TEXT NOT NULL,

  -- Filled once Stripe returns the session, so a waiver can be tied to the
  -- payment it belongs to. Nullable because the row is written first — see
  -- above — and because a failed Checkout creation never produces one.
  stripe_session_id TEXT,

  -- The wording is versioned rather than copied in full. Storing the whole
  -- paragraph per row would be the honest-looking choice and the wrong one:
  -- it invites the text being edited in the code while old rows silently claim
  -- the customer agreed to the new words. A version is a key into a file under
  -- version control, where the history is already kept properly.
  waiver_version    TEXT NOT NULL,

  -- Which language the customer was actually reading when they ticked it.
  -- Consent evidenced in a language the person does not read is not consent,
  -- and this application renders that checkbox in two.
  locale            TEXT NOT NULL,

  accepted_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cancellation_waivers_user_id_idx ON cancellation_waivers (user_id);
CREATE INDEX cancellation_waivers_session_idx ON cancellation_waivers (stripe_session_id);

-- Down Migration

DROP TABLE cancellation_waivers;
