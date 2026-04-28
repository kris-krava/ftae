-- =============================================================================
-- Trigram (pg_trgm) GIN index on artworks.medium for the per-piece medium leg
-- of search. The medium-search query (`SELECT DISTINCT user_id FROM artworks
-- WHERE medium ILIKE '%q%' AND is_active`) replaces the old user_mediums join
-- so that posted-art is the source of truth — see project_ftae_search memory.
-- =============================================================================

-- pg_trgm is created by the prior migration (20260427000000); the create here
-- is idempotent and keeps this file safe to apply standalone.
create extension if not exists pg_trgm;

-- Partial index: search filters `is_active = true` before pattern matching,
-- and we never want soft-deleted artwork showing up in results.
create index if not exists idx_artworks_medium_trgm
  on artworks using gin (medium gin_trgm_ops)
  where is_active;
