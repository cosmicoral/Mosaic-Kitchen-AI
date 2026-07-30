-- Up Migration

-- Every authenticated request filters on expires_at, and the cleanup job
-- deletes by it. Without this index both fall back to a sequential scan.
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Down Migration

DROP INDEX idx_sessions_expires_at;
