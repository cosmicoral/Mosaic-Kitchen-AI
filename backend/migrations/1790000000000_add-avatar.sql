-- Up Migration

-- The object key, not a URL.
--
-- A URL bakes the bucket, the account and the public hostname into every row.
-- Move buckets, put a custom domain in front, or switch provider, and every
-- row is wrong. The key is the only part that is genuinely ours; the service
-- composes the URL at read time from configuration.
--
-- NULL means "no avatar", and that is the normal state: the leopard-cat
-- mascot is the default and most people will never change it.
ALTER TABLE users ADD COLUMN avatar_key TEXT;

-- Down Migration

-- Note: this drops the reference, not the objects. Anything already uploaded
-- is orphaned in the bucket and has to be cleared out separately — a
-- down-migration cannot reach across into object storage, and pretending
-- otherwise would leave somebody believing their photo was deleted.
ALTER TABLE users DROP COLUMN avatar_key;
