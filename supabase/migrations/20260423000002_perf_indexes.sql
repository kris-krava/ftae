-- =============================================================================
-- Pre-launch performance indexes
-- =============================================================================
-- Audit: every hot per-user listing on artworks filters on is_active=true and
-- sorts by created_at desc. The plain (user_id) index forced a separate sort
-- step. The discover feed (no user filter) had no usable created_at index at
-- all and was relying on a sequential scan + sort. Trade lookups by user+
-- status hit two single-column indexes and intersected at the planner level.

-- artworks: per-user listing — profile.getUserArtworks(), home feed
-- (fetchArtworksPage with followed userIds), getArtworkNeighbors.
create index if not exists artworks_active_user_created_idx
  on artworks (user_id, created_at desc)
  where is_active = true;

-- artworks: discover feed (fetchArtworksPage with no userIds filter).
create index if not exists artworks_active_created_idx
  on artworks (created_at desc)
  where is_active = true;

-- trades: searchArtists trade-count fetch and the upcoming "my trades by
-- status" queries. Leftmost-prefix means these also serve plain
-- (initiator_id) / (recipient_id) lookups, so the existing single-column
-- indexes could be dropped later, but we leave them for now to keep this
-- migration non-invasive.
create index if not exists trades_initiator_status_idx
  on trades (initiator_id, status);

create index if not exists trades_recipient_status_idx
  on trades (recipient_id, status);
