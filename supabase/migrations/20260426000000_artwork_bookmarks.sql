-- =============================================================================
-- artwork_bookmarks — private "bookmark for trade" table.
-- =============================================================================
-- Users save artwork they'd like to trade for. Bookmarks are PRIVATE: only the
-- bookmarking user can read their own rows. Artists do NOT see who saved their
-- work pre-launch; this UX rule is enforced at the RLS layer rather than in
-- application code so a bug in a query helper can't leak the data.
--
-- Self-bookmark prevention is enforced in the server action layer
-- (app/_actions/bookmarks.ts) — a DB-level check would require a trigger to
-- read artworks.user_id, and the privacy boundary already keeps this table
-- locked tight.

create table artwork_bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  artwork_id  uuid not null references artworks (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, artwork_id)
);

-- Covers the Trades-page primary query (your saves, newest first) and the
-- bulk "is each of these artworks bookmarked by me?" enrichment used to hydrate
-- grids. The unique (user_id, artwork_id) above doubles as the lookup index
-- for single-artwork checks.
create index artwork_bookmarks_user_created_idx
  on artwork_bookmarks (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — bookmarks are private to the saving user.
-- ---------------------------------------------------------------------------

alter table artwork_bookmarks enable row level security;

-- A user can read only their own bookmarks. No public read policy — artists
-- do not see who has saved their work.
create policy "artwork_bookmarks: self read"
  on artwork_bookmarks for select
  using (user_id = auth.uid());

-- A user can save / unsave their own bookmarks (insert + delete).
create policy "artwork_bookmarks: self insert"
  on artwork_bookmarks for insert
  with check (user_id = auth.uid());

create policy "artwork_bookmarks: self delete"
  on artwork_bookmarks for delete
  using (user_id = auth.uid());

-- Bookmark rows are immutable once written (toggle is delete-then-insert).
-- Explicit deny on update guards against a future migration introducing a
-- permissive `for all` without realizing the table is meant to be append-only.
create policy "artwork_bookmarks: no update"
  on artwork_bookmarks for update
  using (false);
