-- =============================================================================
-- Trigram (pg_trgm) GIN indexes to keep ILIKE %text% searches fast as the user
-- table grows. Today's table is small enough that sequential scans win, but
-- past a few thousand users the artist search would visibly slow.
-- =============================================================================

-- Idempotent extension creation; safe to re-run.
create extension if not exists pg_trgm;

-- Active users only — the search filters `is_active = true` before pattern
-- matching, so the partial index keeps the index size minimal and avoids
-- indexing soft-deleted rows.
create index if not exists idx_users_name_trgm
  on users using gin (name gin_trgm_ops)
  where is_active;

create index if not exists idx_users_username_trgm
  on users using gin (username gin_trgm_ops)
  where is_active;

-- Mediums — small finite list (~10–30 rows) but indexed for symmetry; the
-- trigram path also enables substring LIKE on a name like "Oil on linen".
create index if not exists idx_mediums_name_trgm
  on mediums using gin (name gin_trgm_ops);
