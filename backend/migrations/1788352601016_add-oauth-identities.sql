-- Up Migration

-- A user who signed up with Google has no password and never will unless they
-- set one. NOT NULL here would force us to store a placeholder hash, and a
-- column that lies is harder to reason about than one that is nullable.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE user_identities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('google', 'apple')),

  -- The provider's stable subject identifier. Apple stops sending the email
  -- after the first authorisation and a Google user can change theirs, so this
  -- is the only field that can be trusted to identify the same person twice.
  provider_user_id TEXT NOT NULL,

  -- Kept for support and for the one-time linking decision at first sign-in,
  -- never used to look an identity up.
  email            TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One provider account cannot be attached to two of our users. This is the
  -- constraint that makes takeover-by-re-registration impossible.
  UNIQUE (provider, provider_user_id),

  -- And one of our users cannot have two Google accounts attached, which would
  -- make "unlink Google" ambiguous.
  UNIQUE (user_id, provider)
);

CREATE INDEX user_identities_user_id_idx ON user_identities (user_id);

-- Down Migration

DROP TABLE user_identities;

-- Any passwordless account has to go before the column can be NOT NULL again,
-- otherwise the constraint cannot be revalidated.
DELETE FROM users WHERE password_hash IS NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
