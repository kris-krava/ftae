-- =============================================================================
-- Trigram (pg_trgm) GIN index on users.location_city — adds location as a
-- fourth search leg in /app/discover artist search. See project_ftae_search.
-- =============================================================================

create extension if not exists pg_trgm;

-- Partial index: search filters is_active = true before pattern matching.
create index if not exists idx_users_location_city_trgm
  on users using gin (location_city gin_trgm_ops)
  where is_active;
